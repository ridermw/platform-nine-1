# Platform Nine

A real-time Three.js reconstruction of a Victorian steam railway platform.
The locked visual requirements are in [`goal.md`](goal.md).

## Progress

**Checkpoint 2: runnable browser world.** The Three.js scene includes seven
custom Blender-authored GLB assets, twelve material sets, modular station
architecture, lighting, animated steam, and optional exploration.
The first independent Dream Loop judgment is **4.0/10**; visual acceptance
requires at least **8.0/10** plus acceptable measured performance.
Camera/layout, roof detail, material response, and interior lighting are being
refined. This is a work-in-progress reconstruction, not a completed match.

GitHub Pages is configured at **https://ridermw.github.io/platform-nine-1/**.
Pushes to `main` run the build and asset checks, then deploy the static site.

## Run and capture

Use Node.js 24 or newer (the browser-capture CLI requires it).

```sh
npm ci
npm run dev -- --port 5173
npm test
npm run build
npm run capture -- http://127.0.0.1:5173/platform-nine-1/ round-01
```

Open `/platform-nine-1/`. Click **Explore the platform** to enable orbit/pan/zoom.
**R** resets the hero view; **H** toggles the interface; **Escape** pauses
exploration. `?capture` hides UI and fixes animation time for comparison.
The capture command uses an isolated `agent-browser` session and saves the
actual browser screenshot, metrics, and console output under `.dream-loop/captures/`.

The initial 1920x1080 run measured approximately 60 FPS on the development
machine, 306 draw calls including postprocessing/shadow work, and 1.02 million
rendered triangles per frame including repeated passes. These are local
measurements, not guarantees for every browser or GPU.

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
