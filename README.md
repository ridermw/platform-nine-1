# Platform Nine

A real-time Three.js reconstruction of a Victorian steam railway platform.
The locked visual requirements are in [`goal.md`](goal.md).

## Progress

**Checkpoint 1: asset foundation.** Seven custom Blender-authored GLB assets
and twelve prepared material sets are available. The interactive world, visual
matching loop, and GitHub Pages deployment are in progress; visual acceptance
has not been reached.

- Inspected all 49 supplied reference images before further generation.
- Created a locomotive, tender, carriage, luggage trolley, bench, sign, and lantern.
- Prepared reference-guided albedo atlases and inferred normal/roughness maps.
- No third-party model packs or reference-image backdrops are used.
- Full-resolution reference images and working `.blend` files remain local in
  the gitignored `.dream-loop/` directory.

## Asset provenance and regeneration

`scripts/build_assets.py` authors actual geometry in Blender using metre-scale,
Y-up input coordinates and exports independent glTF assets. From Blender Python:

```python
from pathlib import Path
namespace = {}
exec(compile(Path("/path/to/platform-nine-1/scripts/build_assets.py").read_text(),
             "build_assets.py", "exec"), namespace)
namespace["build"]("/path/to/platform-nine-1")
```

The script preserves the original scene and creates separate asset scenes.
The generated GLBs in `public/models/` are runtime-ready and require no Blender
installation to view.

`scripts/prepare_textures.py` splits the existing generated atlases into portable
maps. It requires Pillow and NumPy. Source atlases are local working assets;
prepared runtime maps and their provenance are in `public/textures/`.
Normal maps are inferred micro-height gradients, not measured normals.

Before requesting another generated image, inspect the reference inventory:

```sh
python3 scripts/reference_sheets.py
```

The atlas prompts are in `scripts/texture-prompts/`. Generation requires the
owner's configured image service; credentials and service metadata are not
included in this repository.
