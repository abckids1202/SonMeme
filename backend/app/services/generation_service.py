from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass, field
from datetime import datetime, timezone
import io
import json
import secrets
from typing import Any, Protocol

import httpx
from PIL import Image, ImageChops, ImageFilter, ImageOps

from app.config import Settings
from app.schemas.generation import GenerationPayload, generation_payload_json


class GenerationProvider(Protocol):
    name: str
    configured: bool

    async def generate(
        self,
        target_bytes: bytes,
        source_bytes: bytes,
        source_mime: str,
        payload: GenerationPayload,
    ) -> bytes:
        """Return one generated PNG or raise a provider error."""


class GenerationProviderError(RuntimeError):
    pass


def build_generation_prompt(payload: GenerationPayload) -> str:
    preset_guidance = {
        "natural": "Use natural photographic blending and match the target lighting and perspective.",
        "scene-blend": "Let the target material, texture, color, and lighting flow through the face so it belongs to the scene, including waves, drawings, and objects.",
        "meme": "Keep the result believable but allow a playful, slightly exaggerated parody finish.",
    }[payload.preset]
    return payload.prompt or (
        "Edit the supplied target image using the supplied Anthony Mackie Son face reference. "
        "Preserve the target composition, pose, background, and all content outside the selected target region. "
        "Keep the source identity recognizable, fit it to the target geometry, and match local lighting, color, "
        "shadows, texture, focus, and perspective. Do not add captions, logos, watermarks, or extra people. "
        f"{preset_guidance}"
    )


def _image_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue()


class MockGenerationProvider:
    """A deterministic local provider used for tests and visual development."""

    name = "mock"
    configured = True

    async def generate(
        self,
        target_bytes: bytes,
        source_bytes: bytes,
        source_mime: str,
        payload: GenerationPayload,
    ) -> bytes:
        del source_mime
        target = ImageOps.exif_transpose(Image.open(io.BytesIO(target_bytes))).convert("RGBA")
        source = ImageOps.exif_transpose(Image.open(io.BytesIO(source_bytes))).convert("RGBA")
        crop = payload.source_crop
        source = source.crop((
            int(crop.x * source.width),
            int(crop.y * source.height),
            max(int((crop.x + crop.width) * source.width), 1),
            max(int((crop.y + crop.height) * source.height), 1),
        ))

        target_box = payload.target.bbox
        output_width = max(2, int(target_box.width * target.width))
        output_height = max(2, int(target_box.height * target.height))
        source.thumbnail((output_width, output_height), Image.Resampling.LANCZOS)
        patch = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
        left = max(0, (output_width - source.width) // 2)
        top = max(0, (output_height - source.height) // 2)
        patch.alpha_composite(source, (left, top))

        mask = Image.new("L", patch.size, 0)
        if len(payload.source_mask) >= 3:
            points = [(point.x * patch.width, point.y * patch.height) for point in payload.source_mask]
            from PIL import ImageDraw

            ImageDraw.Draw(mask).polygon(points, fill=220)
        else:
            from PIL import ImageDraw

            ImageDraw.Draw(mask).ellipse((0, 0, patch.width, patch.height), fill=220)
        mask = mask.filter(ImageFilter.GaussianBlur(max(2, min(output_width, output_height) // 24)))
        patch.putalpha(ImageChops.multiply(patch.getchannel("A"), mask))

        if payload.preset == "scene-blend":
            patch = Image.blend(patch, ImageOps.colorize(mask, (20, 70, 120), (140, 220, 255)).convert("RGBA"), 0.08)
            patch.putalpha(mask)
        target.alpha_composite(patch, (int(target_box.x * target.width), int(target_box.y * target.height)))
        return _image_bytes(target)


class ConfiguredHttpGenerationProvider:
    name = "configured-http"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.name = settings.generation_provider

    @property
    def configured(self) -> bool:
        return bool(self.settings.generation_api_url and self.settings.generation_api_key)

    async def generate(
        self,
        target_bytes: bytes,
        source_bytes: bytes,
        source_mime: str,
        payload: GenerationPayload,
    ) -> bytes:
        if not self.configured or not self.settings.generation_api_url:
            raise GenerationProviderError("Instant AI is not configured on the backend.")
        files = {
            "target_image": ("target.png", target_bytes, "image/png"),
            "source_image": ("source", source_bytes, source_mime or "image/png"),
        }
        data = {
            "model": self.settings.generation_model,
            "preset": payload.preset,
            "target": json.dumps(generation_payload_json(payload)["target"]),
            "source_crop": json.dumps(generation_payload_json(payload)["source_crop"]),
            "source_mask": json.dumps(generation_payload_json(payload)["source_mask"]),
            "prompt": build_generation_prompt(payload),
        }
        headers = {"Authorization": f"Bearer {self.settings.generation_api_key}"}
        timeout = httpx.Timeout(self.settings.generation_timeout_seconds)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(self.settings.generation_api_url, files=files, data=data, headers=headers)
        except httpx.HTTPError as exc:
            raise GenerationProviderError(f"Image provider request failed: {exc}") from exc
        if response.status_code >= 400:
            detail = response.text[:240] or f"HTTP {response.status_code}"
            raise GenerationProviderError(f"Image provider rejected the request: {detail}")
        if response.headers.get("content-type", "").startswith("image/"):
            return response.content
        try:
            body = response.json()
        except ValueError as exc:
            raise GenerationProviderError("Image provider returned neither an image nor JSON.") from exc
        encoded = body.get("imageBase64") or body.get("image_base64") or body.get("image")
        if isinstance(encoded, str):
            if encoded.startswith("data:") and "," in encoded:
                encoded = encoded.split(",", 1)[1]
            try:
                return base64.b64decode(encoded)
            except (ValueError, TypeError) as exc:
                raise GenerationProviderError("Image provider returned invalid base64 image data.") from exc
        raise GenerationProviderError("Image provider JSON did not contain image data.")


@dataclass
class GenerationJob:
    job_id: str
    provider: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "queued"
    result: bytes | None = None
    error: str | None = None
    task: asyncio.Task[None] | None = None


class GenerationService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.provider: GenerationProvider = (
            MockGenerationProvider()
            if settings.generation_provider == "mock"
            else ConfiguredHttpGenerationProvider(settings)
        )
        self.jobs: dict[str, GenerationJob] = {}

    @property
    def enabled(self) -> bool:
        return self.settings.generation_enabled

    @property
    def configured(self) -> bool:
        return self.enabled and self.provider.configured

    def capabilities(self) -> dict[str, Any]:
        if not self.enabled:
            message = "Instant AI is disabled. Add a provider and enable it in the backend environment."
        elif not self.provider.configured:
            message = "Instant AI needs a server-side provider URL and API key."
        else:
            message = "Instant AI is ready."
        return {"enabled": self.enabled, "configured": self.configured, "provider": self.provider.name, "message": message}

    def _cleanup(self) -> None:
        now = datetime.now(timezone.utc)
        max_age = self.settings.generation_temp_ttl_minutes * 60
        expired = [job_id for job_id, job in self.jobs.items() if (now - job.created_at).total_seconds() > max_age]
        for job_id in expired:
            job = self.jobs.pop(job_id)
            if job.task and not job.task.done():
                job.task.cancel()

    def create_job(self, target_bytes: bytes, source_bytes: bytes, source_mime: str, payload: GenerationPayload) -> GenerationJob:
        self._cleanup()
        if not self.configured:
            raise GenerationProviderError(self.capabilities()["message"])
        job = GenerationJob(job_id=secrets.token_urlsafe(12), provider=self.provider.name)
        self.jobs[job.job_id] = job
        job.task = asyncio.create_task(self._run(job, target_bytes, source_bytes, source_mime, payload))
        return job

    async def _run(self, job: GenerationJob, target_bytes: bytes, source_bytes: bytes, source_mime: str, payload: GenerationPayload) -> None:
        job.status = "running"
        try:
            job.result = await self.provider.generate(target_bytes, source_bytes, source_mime, payload)
            job.status = "complete"
        except asyncio.CancelledError:
            job.status = "cancelled"
            raise
        except Exception as exc:  # Provider failures are shown as user-facing job errors.
            job.status = "failed"
            job.error = str(exc)

    def get_job(self, job_id: str) -> GenerationJob | None:
        self._cleanup()
        return self.jobs.get(job_id)

    def cancel_job(self, job_id: str) -> GenerationJob | None:
        job = self.get_job(job_id)
        if job and job.task and not job.task.done():
            job.task.cancel()
            job.status = "cancelled"
        return job

    async def close(self) -> None:
        tasks = [job.task for job in self.jobs.values() if job.task and not job.task.done()]
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.jobs.clear()
