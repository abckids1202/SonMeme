from __future__ import annotations

import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image

from app.config import get_settings
from app.dependencies import get_model_registry
from app.schemas.detection import DetectionResponse
from app.services.model_registry import ModelRegistry

router = APIRouter()


@router.post("/detection", response_model=DetectionResponse, tags=["detection"])
async def detect_faces(
    image: UploadFile = File(...),
    registry: ModelRegistry = Depends(get_model_registry),
) -> DetectionResponse:
    settings = get_settings()
    payload = await image.read()
    if len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds the 15 MB upload limit.")
    try:
        decoded = Image.open(io.BytesIO(payload))
        width, height = decoded.size
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image.") from exc
    if width > settings.max_image_width or height > settings.max_image_height:
        raise HTTPException(status_code=413, detail="Image dimensions are too large.")
    try:
        result = registry.detect(decoded, threshold=settings.detection_confidence_threshold)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    result["faces"] = result["faces"][: settings.max_faces_per_image]
    return DetectionResponse(imageId=str(uuid.uuid4()), **result)
