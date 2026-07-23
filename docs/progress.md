# Sonify Progress

## Current phase

Custom face-detection data preparation and training.

## Implemented

- Vite + React frontend shell
- Generator page
- Model Lab page shell
- Methodology page
- Dark charcoal and yellow visual identity
- Local image preview
- Caption editing
- Canvas-first editor layout with compact header, tool rail, properties panel, and sticky action bar
- Decoded image rendering through Konva instead of a browser image placeholder
- Normalized coordinate helpers and tests
- Explicit mock detector badge and mock face-box path for frontend testing

## In progress

- Face-detection dataset validation
- Custom detector training
- Direct caption manipulation
- Direct emoji manipulation
- Face-box selection

## Not connected

- Backend image upload
- Custom face detector checkpoint
- Landmark checkpoint
- Classical face replacement
- Neural face transformation
- High-resolution export pipeline
- Command-based undo and redo

## Next technical milestone

Connect the first usable custom detector checkpoint to FastAPI and render selectable bounding boxes in React.
