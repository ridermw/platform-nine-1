Use the Dream Loop **Pro workflow** to build a complete, interactive, high-fidelity 3D web world matching `.dream-loop/target.png`.

## Goal

Reconstruct the target as a genuine real-time 3D environment using Three.js. Use Blender when needed to create, refine, UV unwrap, texture, optimize, or export complex assets. The initial camera view must match the target image as closely as possible, while the surrounding environment must remain coherent when explored.

This is a new project. Build and validate it end-to-end; do not stop after planning, blockout, or a first visual approximation. Continue through Dream Loop screenshot-and-judge rounds until an exit criterion is reached.

## Reference package

Treat `.dream-loop/target.png` as the locked visual authority.

Read and use the complete supporting package under `.dream-loop/reference/`:

- `target.txt` and `target.png.metadata.json`: intended scene, composition, and visual treatment
- `objects.json`: estimated object positions and proportions
- `run.json` and `sizes.json`: reference structure and hero-object dimensions
- `clay.png`: geometry, silhouette, and spatial relationships
- `depth.png`: relative depth and scene placement
- `delit.png`: approximate material base colors
- `segmentation.png` and `material-id.png`: object and material boundaries
- `roughness.png`, `wetness.png`, and `emission.png`: PBR material guidance
- `wireframe.png`: modeling density and structural detail
- `isolation/`: close references for the locomotive, tender, carriage, trolley, bench, lantern, and sign
- `ortho/`: turnaround and orthographic references for reconstructing those assets
- All associated prompts, metadata, alignment files, and validation JSON

Use the supporting images as reconstruction evidence. Do not reinterpret or redesign the target.

Before requesting any new image, search and visually inspect all existing reference images and previously generated outputs for a suitable or similar asset. Reuse or adapt existing material first; generate only to fill an identified gap.

## Composition

The default hero camera must reproduce the target’s composition:

- 16:9 landscape framing
- Camera approximately 1.7 meters above the platform
- Approximately a 30 mm full-frame-equivalent lens
- One-point perspective looking toward the distant arched station exit
- Locomotive dominating the left half without clipping its important silhouette
- Platform and brick wall receding along the right
- Round “9 3/4” sign in the upper-right third
- Luggage trolley group prominent in the lower-right foreground
- Iron-and-glass roof framing the upper portion
- Preserve the target’s relative object placements using `objects.json`
- Provide a reset control that returns exactly to this matched hero camera

Match the target at the hero camera first. Exploration is secondary and must not compromise the screenshot match.

## World construction

Build a real, spatially coherent scene—not a diorama made from the target image.

Required geometry includes:

- Detailed scarlet-and-black steam locomotive with smokebox, boiler, cab, wheels, connecting rods, buffers, piping, rivets, brass fittings, and visible undercarriage
- Coal tender and repeated burgundy passenger coaches
- Rails, sleepers, dark ballast, raised platform edge, and individually readable paving
- Long Victorian brick station wall with recessed arched window bays
- Dirty emerald-painted window frames and warm interiors behind the glass
- Repeating iron columns, roof ribs, cross-bracing, and translucent glass roof panels
- Distant station exit, facade, railing, and clock
- Three-dimensional wrought-iron sign bracket and cream enamel “9 3/4” sign
- Brass luggage trolley, three leather trunks, empty brass bird cage, and folded wine-red blanket
- Benches, suitcases, framed notices, wall lanterns, and restrained period dressing
- Thin chimney smoke and low wheel-level steam
- Wet platform patches and the target’s restrained reflections

Do not use `.dream-loop/target.png` as a background plate, skybox, billboard, projected texture, or camera-facing substitute for scene geometry. Do not fake major objects with flat cards. Small texture decals are acceptable only for appropriate surface details such as notices, lettering, grime, and labels.

## Asset strategy

Follow the Dream Loop Pro 3D-asset decision process.

- Do not download third-party internet assets unless I explicitly authorize it.
- If a configured image-to-3D service is available, use it for major detailed hero assets where it will produce better fidelity.
- Use the supplied isolated and orthographic references as image-to-3D or Blender modeling inputs.
- Use Blender for assets that need controlled topology, precise proportions, UVs, material separation, cleanup, or manual correction.
- Export reusable optimized assets as GLB/glTF.
- Procedural Three.js geometry is appropriate for modular architecture, rails, paving, windows, repeating roof structures, and simple dressing—but not as a shortcut for detailed hero objects.
- Complete unseen portions consistently where required for exploration, without changing the visible target-facing design.

Prioritize modeling effort in this order:

1. Locomotive and running gear
2. Camera, platform, tracks, wall, and roof proportions
3. Trolley, luggage, bird cage, and blanket
4. Sign and ornate bracket
5. Tender and passenger coaches
6. Benches, lanterns, windows, clocks, notices, and distant dressing

## Materials

Use physically based materials with proper color, roughness, metalness, normal detail, and controlled variation:

- Rubbed, scratched dark scarlet paint
- Blackened iron and steel with soot, edge wear, and restrained highlights
- Aged and subtly patinated brass
- Irregular red-brown brick and recessed mortar
- Worn honey-brown leather with seams, corner protectors, and scuffs
- Wine-red woven blanket material
- Dirty green painted window frames
- Fine stone paving joints, stains, and localized wetness
- Dusty translucent roof glass
- Dark oily running gear and rails

Use generated or authored texture maps where necessary. Do not settle for flat colors, generic procedural noise, clean plastic surfaces, or uniform roughness.

## Lighting and atmosphere

Reproduce the target’s warm/cool lighting structure:

- Cool blue-grey ambient light in the roof and shadows
- Warm late-afternoon light entering from the distant opening and roof
- Soft directional shafts visible through restrained atmospheric haze
- Warm pools of light from wall lanterns and interior windows
- Natural exposure with preserved shadow detail
- Restrained bloom
- Contact shadows and ambient occlusion around dense machinery and luggage
- Wet surfaces reflecting light without becoming mirror-like
- Thin translucent steam, never a giant opaque smoke cloud

Use a Three.js post-processing pipeline where beneficial, but avoid effects that conceal weak geometry or materials.

## Interaction

Create a polished web presentation:

- Load directly into the target-matched hero camera
- Allow optional mouse-look/orbit or restrained first-person exploration
- Provide a clear reset-to-hero-view control
- Handle resizing and common desktop aspect ratios
- Include a subtle loading state with real asset-loading progress
- Keep UI minimal and visually unobtrusive
- No HUD should appear in Dream Loop comparison screenshots

## Technical expectations

- Use Three.js as the runtime renderer
- Use a clean, maintainable project structure
- Prefer glTF/GLB for Blender-created assets
- Use instancing for repeating architecture and dressing where appropriate
- Use texture compression, sensible LODs, frustum culling, and optimized shadow settings
- Preserve high detail near the hero camera while controlling distant geometry cost
- Target smooth desktop performance without visibly degrading the hero view
- Surface asset-loading or rendering failures explicitly
- Add practical automated checks for startup, asset loading, and the hero-camera configuration
- Document how to install, run, build, and capture the comparison screenshot

## Dream Loop execution

After each meaningful implementation round:

1. Run the application and verify it works.
2. Capture a clean screenshot from the exact hero camera at 3840×2160 if practical, otherwise 1920×1080 with identical framing.
3. Compare it against `.dream-loop/target.png` using a fresh Dream Loop judge.
4. Treat composition and silhouette errors as higher priority than small material details.
5. Address every material judge finding rather than cherry-picking easy fixes.
6. Re-test and capture a new screenshot.
7. Continue until the Pro workflow exit criteria are met.

Do not claim completion based only on the app running. The deliverable is a working, explorable Three.js world whose hero screenshot convincingly matches the target in composition, geometry, lighting, materials, atmosphere, and fine detail.

Do not ask me to choose routine implementation details. Make strong visual and technical decisions autonomously, inspect the result yourself, and iterate.
