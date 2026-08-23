from __future__ import annotations

import io
import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image

from app.services.face_warp_service import warp_rgba, warp_semantic_rgba

router = APIRouter()


@router.post("/warp", response_class=Response, tags=["warp"])
async def warp_face(
    source: UploadFile = File(...),
    mesh: str = Form("[]"),
    semantic: str = Form(""),
    liquify: str = Form("null"),
    mask: str = Form("[]"),
    width: int = Form(256),
    height: int = Form(256),
    feather: float = Form(5),
    revision: int = Form(0),
) -> Response:
    try:
        source_image = Image.open(io.BytesIO(await source.read())).convert("RGBA")
        mesh_data = json.loads(mesh)
        mask_data = json.loads(mask)
        semantic_data = json.loads(semantic) if semantic else None
        liquify_data = json.loads(liquify) if liquify and liquify != "null" else None
        if semantic_data:
            output = warp_semantic_rgba(
                source_image, semantic_data, liquify_data, mask_data, (width, height), feather,
            )
        else:
            output = warp_rgba(source_image, mesh_data, mask_data, (width, height), feather)
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail=f"Could not warp the face: {exc}") from exc
    payload = io.BytesIO()
    output.save(payload, format="PNG", optimize=True)
    return Response(
        content=payload.getvalue(),
        media_type="image/png",
        headers={"X-Warp-Revision": str(revision)},
    )
