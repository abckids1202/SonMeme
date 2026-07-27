# API

All application endpoints live under `/api/v1`.

## `GET /api/v1/health`

Returns service status, selected device/runtime, model availability, and loaded model metadata.

Error responses use:

```json
{
  "error": {
    "code": "NO_FACE_DETECTED",
    "message": "No face was detected in the uploaded image.",
    "details": {}
  }
}
```

## `POST /api/v1/detection`

Upload one JPEG, PNG, or WebP image as the `image` multipart field. The custom-trained FCOS detector returns normalized boxes for the React canvas and pixel boxes for debugging. The checkpoint is loaded once during FastAPI startup.

The default runtime checkpoint is `models/detector/production/fcos_face_lite_416_v1.pt`; copy it from the completed training run as described in `models/detector/production/README.md`.
