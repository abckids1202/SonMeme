from __future__ import annotations

import base64
import io
import json
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageOps

from app.config import Settings
from app.schemas.sonify import SonifyAnalysis, SonifyRegion


class OpenAISonifyError(RuntimeError):
    """A user-facing error from the OpenAI Sonify pipeline."""


class OpenAISonifyService:
    """Runs one vision analysis followed by one two-image edit."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def configured(self) -> bool:
        return bool(self.settings.openai_api_key)

    def capabilities(self) -> dict[str, Any]:
        return {
            "configured": self.configured,
            "vision_model": self.settings.openai_vision_model,
            "image_model": self.settings.openai_image_model,
            "message": "OpenAI image generation is ready." if self.configured else "Add OPENAI_API_KEY to the backend environment.",
        }

    def _source_path(self) -> Path:
        return Path(__file__).resolve().parents[3] / "frontend" / "public" / "source-faces" / "anthony-front.png"

    @staticmethod
    def _data_url(payload: bytes, mime: str = "image/png") -> str:
        return f"data:{mime};base64,{base64.b64encode(payload).decode('ascii')}"

    @staticmethod
    def _image_size(payload: bytes) -> tuple[int, int]:
        try:
            with Image.open(io.BytesIO(payload)) as image:
                image = ImageOps.exif_transpose(image)
                return image.size
        except Exception as exc:
            raise OpenAISonifyError("The uploaded image could not be read.") from exc

    @staticmethod
    def normalize_mime(payload: bytes, declared: str | None = None) -> str:
        """Use the decoded file format instead of trusting a client MIME header."""
        try:
            with Image.open(io.BytesIO(payload)) as image:
                formats = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
                return formats.get((image.format or "").upper(), "image/png")
        except Exception:
            return declared if declared in {"image/png", "image/jpeg", "image/webp"} else "image/png"

    @staticmethod
    def _output_size(width: int, height: int) -> str:
        scale = min(1536 / max(width, height), 1.0)
        output_width = max(256, int(round(width * scale / 16)) * 16)
        output_height = max(256, int(round(height * scale / 16)) * 16)
        return f"{output_width}x{output_height}"

    @staticmethod
    def _extract_text(body: dict[str, Any]) -> str:
        if isinstance(body.get("output_text"), str):
            return body["output_text"]
        parts: list[str] = []
        for item in body.get("output", []):
            for content in item.get("content", []):
                if isinstance(content.get("text"), str):
                    parts.append(content["text"])
        return "\n".join(parts)

    @staticmethod
    def _parse_analysis(text: str) -> SonifyAnalysis:
        cleaned = text.strip()
        if "```" in cleaned:
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        try:
            raw = json.loads(cleaned)
            region = raw.get("region")
            parsed_region = SonifyRegion.model_validate(region) if isinstance(region, dict) else None
            target_type = raw.get("target_type", "unknown")
            if target_type not in {"face", "faces", "object", "unknown"}:
                target_type = "unknown"
            return SonifyAnalysis(
                target_type=target_type,
                confidence=max(0.0, min(1.0, float(raw.get("confidence", 0.0)))),
                region=parsed_region,
                description=str(raw.get("description", ""))[:500],
            )
        except (ValueError, TypeError, json.JSONDecodeError):
            return SonifyAnalysis(target_type="unknown", confidence=0.0, description="The scene could not be classified reliably.")

    async def _request(self, client: httpx.AsyncClient, method: str, url: str, **kwargs: Any) -> httpx.Response:
        try:
            response = await client.request(method, url, **kwargs)
        except httpx.HTTPError as exc:
            raise OpenAISonifyError(f"OpenAI could not be reached: {exc}") from exc
        if response.status_code >= 400:
            try:
                detail = response.json().get("error", {}).get("message", response.text)
            except ValueError:
                detail = response.text
            raise OpenAISonifyError(f"OpenAI rejected the request: {str(detail)[:300]}")
        return response

    async def analyze(self, client: httpx.AsyncClient, target_bytes: bytes, target_mime: str) -> SonifyAnalysis:
        body = {
            "model": self.settings.openai_vision_model,
            "input": [{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": (
                        "Analyze this image for the Sonify parody editor. Return JSON only with keys "
                        "target_type (face, faces, object, or unknown), confidence (0 to 1), "
                        "region (normalized x, y, width, height for the main target or null), and "
                        "description (short scene description). Choose face/faces for photographic or drawn people; "
                        "choose object when the image is a thing or scene where the Son face should be integrated."
                    )},
                    {"type": "input_image", "image_url": self._data_url(target_bytes, target_mime)},
                ],
            }],
        }
        response = await self._request(client, "POST", "https://api.openai.com/v1/responses", json=body)
        return self._parse_analysis(self._extract_text(response.json()))

    async def generate(self, target_bytes: bytes, target_mime: str) -> tuple[bytes, SonifyAnalysis, int, int]:
        if not self.configured:
            raise OpenAISonifyError(self.capabilities()["message"])
        source_path = self._source_path()
        if not source_path.exists():
            raise OpenAISonifyError("The bundled Anthony Mackie source face is missing.")
        source_bytes = source_path.read_bytes()
        width, height = self._image_size(target_bytes)
        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        timeout = httpx.Timeout(self.settings.openai_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
            analysis = await self.analyze(client, target_bytes, target_mime)
            target_hint = (
                f"The vision analysis classified the target as {analysis.target_type} with confidence "
                f"{analysis.confidence:.2f}. Main region: {analysis.region.model_dump_json() if analysis.region else 'none'}. "
                f"Scene notes: {analysis.description}"
            )
            prompt = (
                "Create a single finished Sonify parody image. Use the first image as the complete target scene and "
                "the second image as the Anthony Mackie reference face. Preserve the target's composition, camera angle, "
                "background, lighting direction, texture, and recognizable scene details. Apply a direct face-placement "
                "meme: keep the Anthony Mackie Son identity, facial proportions, expression, eyes, nose, mouth, and "
                "skin detail recognizable, and place that face only over the intended target face area. Blend the edges "
                "enough to look like a face placed onto the subject, but do not transform the whole target into the "
                "source style and do not let the source face take over the body, clothing, or background. For an object "
                "or scene with no person, place the Son face on the most obvious face-like focal area while preserving "
                "the object's original material and composition. Keep everything outside that face area unchanged. Do "
                "not add words, captions, emojis, logos, borders, watermarks, or extra people. Do not return a collage "
                "or split view. " + target_hint
            )
            # The image-edit API accepts multiple images as an array. With multipart
            # requests its current parser requires the bracketed array field name.
            files = [
                ("image[]", ("target.png", target_bytes, target_mime or "image/png")),
                ("image[]", ("anthony-mackie.png", source_bytes, "image/png")),
            ]
            data = {
                "model": self.settings.openai_image_model,
                "prompt": prompt,
                # Small uploads can fall below the model's minimum pixel budget;
                # auto selects a valid output while retaining the target aspect.
                "size": "auto",
                "quality": self.settings.openai_image_quality,
                "output_format": "png",
            }
            response = await self._request(client, "POST", "https://api.openai.com/v1/images/edits", files=files, data=data)
            payload = response.json()
            encoded = (payload.get("data") or [{}])[0].get("b64_json")
            if not encoded:
                raise OpenAISonifyError("OpenAI returned no generated image.")
            try:
                result = base64.b64decode(encoded)
            except (ValueError, TypeError) as exc:
                raise OpenAISonifyError("OpenAI returned invalid image data.") from exc
            return result, analysis, width, height
