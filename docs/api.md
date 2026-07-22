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

Upload, detection, generation, and export endpoints are planned for the next milestones.
