# Light Run 3D assets

Low-poly, clay-toy vehicle models for the expressway: game-ready GLBs built procedurally in Blender.
Source scripts live in `tools/blender/` (rebuild the primary set and its previews with `tools/blender/build_all.sh`, which needs Blender 4.2 LTS at `/opt/blender/blender` or `$BLENDER`, plus python3 with Pillow). Previews are in `/workspace/previews/vehicles/v1_final/`.

## Files

**Primary set = v1-final** (the first-version danfo with the open door and roof luggage, plus the v2 lettering).

| File | Triangles | Size | Nodes (children of the root) |
|---|---|---|---|
| `vehicles/danfo.glb` | 2,562 (body 2,112, decals 26, wheels 4×106) | 131 KB | `danfo` → `danfo_body`, `danfo_decals`, `wheel_FL`, `wheel_FR`, `wheel_RL`, `wheel_RR` |
| `vehicles/danfo_lod1.glb` | 1,162 (45%) | 80 KB | `danfo_lod1` → same child names |
| `vehicles/okada.glb` | 2,318 = bike 1,508 (body 1,112, decals 100, wheels 2×148) + rider 810 | 115 KB | `okada` → `okada_body`, `okada_decals`, `wheel_F`, `wheel_R`, `rider` |
| `vehicles/okada_lod1.glb` | 1,180 = bike 776 (51%) + rider 404 (50%) | 81 KB | `okada_lod1` → same child names |

**Alternative: `vehicles/alt_v2/`** holds the v2 rebuild (VW T3 pinstripe danfo with closed doors and a low rear rack, and a Bajaj Boxer okada with spoked wheels), with the same file and node names: danfo 2,586 / 1,172 tris, okada bike 1,594 + rider 778 / 792 + 372. Its wheel radii are 0.43 (danfo) and 0.36 (okada). Rebuild it with `tools/blender/v2/build_all.sh`; previews are in `/workspace/previews/vehicles/v2/`.

- **Uncompressed GLB, on purpose.** Draco and meshopt both need extra decoders (DRACOLoader plus a wasm or js decoder, or `meshopt_decoder`) that the game doesn't ship. The files are already under 150 KB, and gzip/brotli on GitHub Pages shrinks them further over the wire.
- **Colour is per-vertex** (`COLOR_0`, linear, stored as normalized unsigned-byte RGBA to keep files small), from a small warm palette that matches `js/props.js`.
- **Three materials:** `clay` (roughness 0.72), `gloss` (roughness 0.22, for glass, chrome and lamps), and `decal`. The wheels and the rider use `clay` only. GLTFLoader sets `vertexColors = true` automatically.
- **Lettering is a decal layer.** `*_decals` is a separate mesh of small quads that sit 6–11 mm proud of the body. It uses one embedded 256×256 grey+alpha PNG atlas (14 KB) of white glyphs (Barlow Condensed Bold, SIL OFL), tinted by vertex colour: black ink on the danfo, white on the okada. It has `alphaMode: MASK` with cutoff 0.5, so GLTFLoader gives `alphaTest = 0.5` with no sorting issues.
  - Danfo: `OSHODI - CMS` on the front panel between the grille band and the badge, `NO PARKING` (10 cm tall) on both cab doors in the yellow band under the door glass, `LAGOS` on both faces of the roof board, and `52` stickers (white sticker plus black number) on the windscreen.
  - Okada: `OKADA - OBALENDE` on both sides of the tank, and `NO PARKING` on both side panels.
  - The atlas source is `tools/blender/make_decals.py`, which writes `decal_atlas.png` and `decals.json`.
- Checked with Khronos glTF-Validator (0 errors, 0 warnings, 0 infos) on all eight files, primary and `alt_v2`. Loaded with three r187 GLTFLoader against `js/vendor/three.min.js`, including the decal texture.

## Scale, pivot and facing (built to drop in for `danfo()` / `okada()` in js/props.js)

- Units are metres, the same as the game: lanes at x = −3.2 / 0 / 3.2, and the chibi player is about 1.5 m tall.
- The pivot is at the ground centre (y = 0 at tyre contact), and +Y is up.
- **Front = −Z.** That is the same as the current in-code vehicles: headlights at −Z, tail lights and plate at +Z, which is what the runner sees. Obstacles therefore keep `rotation.y = 0`, and oncoming traffic keeps `rotation.y = Math.PI`, exactly as now.
- **Danfo (v1-final):**
  - Size: body 2.10 m wide (2.49 m with mirrors) and 4.98 m bumper to bumper, so the old collision `len: 4.6` still fits. The roof shell tops out at 1.99 m, so `surf: 2.08` still works.
  - Bodywork: two thick black bands (y 0.70–0.82 and 1.17–1.27). The right sliding door is slid back over the rear flank, leaving the passenger bay open with a bench seat inside. There's a dent with rust patches on the rear-left flank.
  - Roof: the rack (rails at 2.17 m) runs almost the full roof. It carries a red, white and blue Ghana Must Go bag, a sack and a blue tarp roll, and the luggage tops out at about 2.64 m. The framed yellow `LAGOS` board stands raked back on two legs at the rack's front edge, ahead of the bag, and tops out at about 2.6 m.
  - Wheels have radius 0.50 at z = ±1.50, x = ±0.89.
- **Okada (v1-final):** 2.37 m long and 0.94 m wide at the mirrors. Wheels have radius 0.40 at z = −0.76 (front) and +0.72 (rear). The seat top is about 1.10 m, and the rider's helmet tops out at 2.21 m.
- **Rear plate overlay:** the danfo's rear face is at z ≈ +2.31. A blank white plate (with a green strip) is modelled at `(0, 0.76, 2.33)`, so you can still lay the random `LAGOS` plate texture over it at z ≈ 2.35.
- **Wheels** are separate nodes, each with its own origin at the hub, so they spin about local X. Driving toward −Z, spin with `wheel.rotation.x -= speed * dt / r` (r = 0.50 danfo, 0.40 okada; 0.43 / 0.36 for `alt_v2`).
- **Rider** is its own node: toggle it with `gltf.scene.getObjectByName('rider').visible = false`.

## Loading in the game

The game imports three as an ES module from `js/vendor/three.min.js` (r187), which doesn't include GLTFLoader. A patched copy of the r187 loader is in
`assets/vendor/three-addons/` (`loaders/GLTFLoader.js` plus its two helpers, `utils/BufferGeometryUtils.js` and `utils/SkeletonUtils.js`).
Its `from 'three'` imports are rewritten to `../../../../js/vendor/three.min.js`, which resolves to the same URL the game already uses, so it shares the same THREE instance. Move it into `js/vendor/` if you prefer, but then fix the relative path.

```js
// in js/props.js (or a new js/models.js)
import { GLTFLoader } from '../assets/vendor/three-addons/loaders/GLTFLoader.js';
const gltfLoader = new GLTFLoader(), MODELS = {};
export async function preloadVehicles() {
  for (const n of ['danfo', 'danfo_lod1', 'okada', 'okada_lod1'])
    MODELS[n] = (await gltfLoader.loadAsync(`assets/vehicles/${n}.glb`)).scene;
}
export function danfoGLB(lod = 0) {
  const g = MODELS[lod ? 'danfo_lod1' : 'danfo'].clone();   // clone() shares geometry and materials: cheap
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; /* if (!o.name.includes('decals')) { o.material = VC; outline(o, 0.05); } */ } });
  g.userData = { len: 4.6, exhaust: [0.6, 0.45, 2.4], wheels: ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'].map(n => g.getObjectByName(n)) };
  return g;
}
```

Notes for integration:
- **Toon look:** to match the rest of the scene, swap the materials for the game's `VC` toon material (`o.material = VC`), which already uses vertex colours, and add `outline(o, th)` for the ink line. **Leave the `*_decals` meshes alone:** keep their own material, since it holds the atlas map and `alphaTest`, or make a toon copy with `map` + `alphaTest: 0.5` + `vertexColors`. Don't outline them, and don't let them cast shadows. The normals are smooth, with hard splits at sharp edges (40°), so the inverted-hull outline may show tiny gaps at a few hard edges. Raise `th` a touch or skip outlines on wheels.
- **Draw calls:** the danfo is 7 draw calls (`danfo_body` = clay + gloss primitives, `danfo_decals`, and 4 wheels). The okada is 6 (body ×2, decals, 2 wheels, rider). If you drop the lettering at distance (`*_decals.visible = false` on LOD1), you save one draw call. For parked or static vehicles (`danfoP`, `danfoR`, flyover traffic), merge everything into one geometry (`BufferGeometryUtils.mergeGeometries` after `applyMatrix4(o.matrixWorld)`) for 1 draw call. The wheels don't need to spin there.
- **Traffic instancing:** for many danfos, create one `InstancedMesh` per geometry (body-clay, body-gloss, decals, wheel) and share instance matrices. If wheel spin matters, update the wheel instance matrices per frame. Otherwise use LOD1 for anything more than about 60 m away.
- **Load timing:** loading is async, so preload during the title screen and keep the old procedural `danfo()` / `okada()` as a fallback until `MODELS` is ready.
- **Offline:** add the GLBs (the textures are embedded, so there are no extra files) and the `assets/vendor/three-addons/**` files to `CORE` in `sw.js` (and bump `VERSION`) so offline play still works.
- **Colour variety:** the old `okada()` picks a random body colour. The GLB is red. For variety, recolour by remapping the red `COLOR_0` values on a cloned geometry, or keep a few pre-tinted clones. `COLOR_0` arrives as a normalized `Uint8` attribute, so read it with `getX()`/`setX()`, which handle normalization, rather than raw array writes.
