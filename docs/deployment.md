# Deployment

Sonify is deployed as two services:

- Vercel serves `frontend/`, the Vite React application.
- Render serves `backend/` as a Docker web service.

## Render

1. In Render, choose **New +** → **Blueprint** and select the GitHub repository.
2. Render reads the root `render.yaml` and creates `sonify-api`.
3. After the service is created, copy its public URL, for example `https://sonify-api.onrender.com`.
4. Set the `FRONTEND_ORIGINS` environment variable to the final Vercel URL, for example `https://sonmeme.vercel.app`.

The health check is:

```text
https://sonify-api.onrender.com/api/v1/health
```

Render uses the CPU production face-recognition detector and the OpenCV/TPS warp. The locally trained PyTorch checkpoint is ignored by Git and is not copied into this public image. Do not commit model weights; use private object storage and a startup download step if the custom checkpoint must be deployed later.

## Vercel

Create a Vercel project from the same repository with:

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Set this environment variable for the Production environment:

```text
VITE_API_BASE_URL=https://sonify-api.onrender.com/api/v1
```

Redeploy Vercel after setting it. The included `frontend/vercel.json` keeps React Router routes such as `/ideal` working on refresh.

## Local production-like check

```powershell
docker build -f backend/Dockerfile -t sonify-api .
docker run --rm -p 8000:8000 `
  -e FRONTEND_ORIGINS=http://localhost:5173 `
  -e MODEL_DEVICE=cpu `
  sonify-api
```
