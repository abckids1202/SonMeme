from __future__ import annotations

import io
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image

from app.config import get_settings
from app.dependencies import get_generation_service
from app.schemas.generation import GenerationCapabilities, GenerationJobResponse, GenerationPayload
from app.services.generation_service import GenerationProviderError, GenerationService

router = APIRouter()


async def _read_image(upload: UploadFile, maximum_bytes: int) -> bytes:
    payload = await upload.read()
    if len(payload) > maximum_bytes:
        raise HTTPException(status_code=413, detail="Image exceeds the upload limit.")
    try:
        with Image.open(io.BytesIO(payload)) as image:
            image.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded image is not readable.") from exc
    return payload


def _job_response(job) -> GenerationJobResponse:
    return GenerationJobResponse(
        job_id=job.job_id,
        status=job.status,
        result_url=f"/generation/jobs/{job.job_id}/result" if job.status == "complete" else None,
        error=job.error,
        provider=job.provider,
    )


@router.get("/generation/capabilities", response_model=GenerationCapabilities, tags=["generation"])
async def generation_capabilities(service: GenerationService = Depends(get_generation_service)) -> GenerationCapabilities:
    return GenerationCapabilities(**service.capabilities())


@router.post("/generation/jobs", response_model=GenerationJobResponse, status_code=202, tags=["generation"])
async def create_generation_job(
    target_image: UploadFile = File(...),
    source_image: UploadFile = File(...),
    preset: str = Form("natural"),
    target: str = Form(...),
    source_crop: str = Form(...),
    source_mask: str = Form("[]"),
    prompt: str | None = Form(None),
    service: GenerationService = Depends(get_generation_service),
) -> GenerationJobResponse:
    settings = get_settings()
    if not service.configured:
        raise HTTPException(status_code=503, detail=service.capabilities()["message"])
    try:
        payload = GenerationPayload(
            preset=preset,
            target=json.loads(target),
            source_crop=json.loads(source_crop),
            source_mask=json.loads(source_mask),
            prompt=prompt,
        )
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid generation geometry: {exc}") from exc
    target_bytes = await _read_image(target_image, settings.max_upload_mb * 1024 * 1024)
    source_bytes = await _read_image(source_image, settings.max_upload_mb * 1024 * 1024)
    try:
        job = service.create_job(target_bytes, source_bytes, source_image.content_type or "image/png", payload)
    except GenerationProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return _job_response(job)


@router.get("/generation/jobs/{job_id}", response_model=GenerationJobResponse, tags=["generation"])
async def get_generation_job(job_id: str, service: GenerationService = Depends(get_generation_service)) -> GenerationJobResponse:
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job was not found or has expired.")
    return _job_response(job)


@router.post("/generation/jobs/{job_id}/cancel", response_model=GenerationJobResponse, tags=["generation"])
async def cancel_generation_job(job_id: str, service: GenerationService = Depends(get_generation_service)) -> GenerationJobResponse:
    job = service.cancel_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job was not found or has expired.")
    return _job_response(job)


@router.get("/generation/jobs/{job_id}/result", tags=["generation"])
async def get_generation_result(job_id: str, service: GenerationService = Depends(get_generation_service)) -> Response:
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job was not found or has expired.")
    if job.status != "complete" or not job.result:
        raise HTTPException(status_code=409, detail=job.error or "Generation is not complete.")
    return Response(content=job.result, media_type="image/png", headers={"Cache-Control": "no-store"})
