# Face fitting

Sonify uses the production landmark detector to choose a target and initialize a face-shaped crop. The bundled Anthony source is ready by default, while custom source images can be reviewed and corrected with ordinary crop handles.

The focused editor uses a browser-side compositor for the interactive face layer and export. A proportional transform is the default; Distort mode exposes four corners for perspective fitting. This keeps preview and export on the same normalized coordinate system.

The legacy backend warp endpoint and semantic TPS implementation remain available for compatibility and tests, but the main editor does not call them for every edit. Manual targets use the same face layer controls, so drawings, objects, and unusual compositions do not depend on automatic detection.
