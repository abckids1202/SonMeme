from __future__ import annotations

import io
import asyncio

import pytest
from PIL import Image
from pydantic import ValidationError

from app.config import Settings
from app.schemas.generation import GenerationPayload
from app.services.generation_service import GenerationService, build_generation_prompt


def image_bytes(color: tuple[int, int, int]) -> bytes:
    image = Image.new("RGB", (96, 96), color)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def payload() -> GenerationPayload:
    return GenerationPayload(
        preset="natural",
        target={"kind": "manual", "bbox": {"x": 0.2, "y": 0.2, "width": 0.4, "height": 0.4}},
        source_crop={"x": 0, "y": 0, "width": 1, "height": 1},
        source_mask=[{"x": 0.1, "y": 0.5}, {"x": 0.5, "y": 0.1}, {"x": 0.9, "y": 0.5}, {"x": 0.5, "y": 0.9}],
    )


def test_disabled_service_reports_a_safe_local_fallback() -> None:
    service = GenerationService(Settings())

    assert service.configured is False
    assert service.capabilities()["enabled"] is False
    assert "disabled" in service.capabilities()["message"]


def test_target_geometry_cannot_escape_the_image() -> None:
    with pytest.raises(ValidationError):
        GenerationPayload(
            preset="natural",
            target={"kind": "manual", "bbox": {"x": 0.8, "y": 0.2, "width": 0.4, "height": 0.4}},
            source_crop={"x": 0, "y": 0, "width": 1, "height": 1},
        )


def test_scene_blend_prompt_preserves_identity_and_scene() -> None:
    text = build_generation_prompt(payload().model_copy(update={"preset": "scene-blend"}))

    assert "recognizable" in text
    assert "target composition" in text
    assert "waves" in text
    assert "captions" in text


def test_mock_provider_completes_a_temporary_job() -> None:
    async def run() -> None:
        service = GenerationService(Settings(generation_enabled=True, generation_provider="mock"))
        job = service.create_job(image_bytes((20, 40, 80)), image_bytes((220, 120, 80)), "image/png", payload())
        assert job.task is not None
        await job.task

        completed = service.get_job(job.job_id)
        assert completed is not None
        assert completed.status == "complete"
        assert completed.result is not None
        with Image.open(io.BytesIO(completed.result)) as result:
            assert result.size == (96, 96)

        await service.close()

    asyncio.run(run())
