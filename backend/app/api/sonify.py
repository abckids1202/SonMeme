from __future__ import annotations

import base64
import io

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.config import get_settings
from app.schemas.sonify import SonifyResponse
from app.services.openai_sonify_service import OpenAISonifyError, OpenAISonifyService

router = APIRouter(prefix="/sonify", tags=["sonify"])


def _service() -> OpenAISonifyService:
    return OpenAISonifyService(get_settings())


@router.get("/capabilities")
async def capabilities() -> dict:
    return _service().capabilities()


@router.post("", response_model=SonifyResponse)
async def sonify(target_image: UploadFile = File(...)) -> SonifyResponse:
    settings = get_settings()
    service = _service()
    if not service.configured:
        raise HTTPException(status_code=503, detail=service.capabilities()["message"])
    payload = await target_image.read()
    if len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds the upload limit.")
    try:
        with Image.open(io.BytesIO(payload)) as image:
            image.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded image is not readable.") from exc
    try:
        mime = service.normalize_mime(payload, target_image.content_type)
        result, analysis, width, height = await service.generate(payload, mime)
    except OpenAISonifyError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return SonifyResponse(
        image_base64=base64.b64encode(result).decode("ascii"),
        width=width,
        height=height,
        analysis=analysis,
        model=settings.openai_image_model,
    )
