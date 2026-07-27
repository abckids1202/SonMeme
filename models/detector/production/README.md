# Sonify detector production candidate

The runtime expects the local checkpoint at:

`fcos_face_lite_416_v1.pt`

This file is intentionally ignored because trained weights are large. Copy it from the best training checkpoint:

```cmd
copy "models\detector\checkpoints\det_fcos_mnv3_416_gtx1650_full_20260727_183218\best_ap50.pt" "models\detector\production\fcos_face_lite_416_v1.pt"
```

The matching configuration is `ml/configs/detector/widerface_fcos_mnv3_416.yaml`.
