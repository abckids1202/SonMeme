# Semantic face fitting

Sonify uses the production landmark detector to place a source face through named controls: forehead, temples, eyes, nose, mouth corners, jaw, and chin. The bundled Anthony source has cached coordinates from the same landmark pipeline, so Auto Fit has a real source-to-target correspondence instead of guessing from a rectangular box.

The browser keeps layer placement separate from local deformation:

- Move changes position, size, and rotation with the normal Konva transformer.
- Fit exposes only semantic handles and target guides. Symmetry, group movement, snapping, ghost opacity, and Auto Fit live in the editor store.
- Liquify uses an invisible 16 x 16 displacement field. Brush movement updates the field, not the layer transform.
- Mask remains a small polygon boundary with feathering so it is easy to reset and export.

The backend renders the semantic fit with an inverse thin-plate-spline map. Fixed boundary controls keep the rest of the source stable, then the liquify field and mask are applied before returning the PNG. Requests carry a revision and the browser discards stale responses, so a slow render cannot overwrite a newer drag.

The legacy 4 x 4 piecewise-affine renderer remains available for old callers and tests, but the editor no longer displays or edits that grid. Manual targets use the same controls: Quick Fit opens semantic handles, while Free Fit uses the normal layer transformer for objects and unusual shapes.
