FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements-render.txt ./requirements.txt
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r requirements.txt
RUN mkdir -p /models \
    && curl -fsSL "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite" \
      -o /models/blaze_face_short_range.tflite
COPY backend/app ./app
# The OpenAI image-edit request uses the bundled Son reference at runtime.
# Include it explicitly because the backend image does not copy the frontend build.
COPY frontend/public/source-faces /frontend/public/source-faces
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
