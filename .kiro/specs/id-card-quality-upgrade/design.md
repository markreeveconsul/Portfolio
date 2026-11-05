# Design: 3D ID Card Quality Upgrade

## Overview

The hero ID card is a WebGL scene (`src/components/floating-id-card-scene.tsx`) that maps two
canvas-generated faces (`src/components/id-card-textures.ts`) onto an extruded rounded-rectangle
geometry, with custom GLSL shaders for a sheen sweep, a foil thread, and an iridescent rule line,
plus a flat shader-plane contact shadow. The card looks good but leaves visible quality on the
table: soft edges on high-DPI screens, a dull foil thread with nothing to reflect, faceted corners
up close, crawling thin lines, and a card surface that reads as flat plastic.

This design upgrades the rendering fidelity across three tiers while preserving the existing
architecture, the CSS fallback path, the reduced-motion/mobile behavior, and the
`SceneErrorBoundary` safety net. No visual regression to the fallback card; all changes are scoped
to the interactive WebGL scene and (for the microtexture) the procedural texture module.

### Goals
- Sharper rendering on high-density displays.
- A foil thread and card shell that reflect a believable studio environment.
- Smooth corner silhouette and crisp thin features (foil thread, rule line, edges).
- A grounded, soft contact shadow and a card surface that reads as real matte plastic with a
  moving clearcoat highlight.

### Non-goals
- No change to the card copy, layout, QR, or face-canvas content.
- No change to the CSS/DOM fallback card beyond what it already renders.
- No new binary image assets (normal map is generated procedurally).

## Current Architecture (as-is)

- `HeroIdCard` (`hero-id-card.tsx`) decides between the CSS fallback and the dynamic WebGL
  `HeroIdCardScene` based on `prefers-reduced-motion`, viewport width, and WebGL support.
- `HeroIdCardScene` renders a `<Canvas dpr={[1, 1.4]} ...>` with `ambientLight` + two
  `directionalLight`s and the `CardRig` → `FloatingCard`.
- `FloatingCard`:
  - Builds geometry with `createCardGeometry()` (`ExtrudeGeometry`, `bevelSegments: 3`,
    `curveSegments: 8`), remaps cap UVs, and assigns 3 material groups (front face, back face,
    shell).
  - Face materials are `MeshBasicMaterial` with `toneMapped: false`.
  - Shell is `MeshPhysicalMaterial` (roughness 0.52, metalness 0.12, clearcoat 0.2).
  - Foil thread is `MeshPhysicalMaterial` (metalness 0.9, iridescence 1.0) plus a
    `foilSpectrumMaterial` shader overlay.
  - Sheen + rule + shadow are custom `ShaderMaterial`s.

## Design by Tier

### Tier 1 — Sharpness, color, and reflections (no new deps)

**1.1 Device pixel ratio**
Raise the DPR cap on `<Canvas>` from `[1, 1.4]` to `[1, 2]`. This is the largest single sharpness
win. Keep the lower bound at 1 so weak GPUs are not overloaded. DPR interacts with performance;
pair with the perf guard in 1.5.

**1.2 Tone mapping + color management**
Set renderer color management explicitly in `onCreated` (or via `gl` props):
- `gl.toneMapping = THREE.ACESFilmicToneMapping`
- `gl.toneMappingExposure ≈ 1.0` (tunable)
- `gl.outputColorSpace = THREE.SRGBColorSpace`

The face materials keep `toneMapped: false` so the card artwork colors stay exactly as authored;
only the lit physical materials (shell, foil) receive tone mapping. This makes the metal read as
metal rather than a flat gradient.

**1.3 Environment map**
Add drei `<Environment preset="studio" background={false} />` (package already installed). This
gives the `MeshPhysicalMaterial` surfaces something to reflect. Preset is loaded as an
environment-only probe (no visible background), so the transparent canvas is preserved.
- Consideration: drei `Environment` presets fetch an HDR from a CDN by default. To stay offline and
  avoid a network dependency in the hero, prefer the `Lightformer`-based in-scene environment
  (`<Environment resolution={256}>` with a few `<Lightformer>` rects) OR a local HDR. Decision:
  **use `<Environment>` with inline `<Lightformer>`s** — zero network, fully controllable, cheap.
  Two or three soft rect lights (key, fill, rim) reproduce a studio softbox look.

**1.4 Foil reflectivity**
With an environment present, tune the foil `MeshPhysicalMaterial`:
- add `envMapIntensity ≈ 1.2`
- keep `iridescence: 1.0`, nudge `iridescenceThicknessRange` if needed
- lower `roughness` slightly (e.g. 0.56 → 0.4) so reflections read.
The `foilSpectrumMaterial` shader overlay stays as the colored sweep on top.

**1.5 Performance guard**
Higher DPR + environment increases GPU cost. Add a lightweight guard:
- Keep `dpr={[1, 2]}` but allow the existing fallback logic to remain the first line of defense
  (mobile already uses the CSS card).
- Optionally expose `exposure` and env intensity as constants for easy tuning.

### Tier 2 — Geometry smoothing, anti-aliasing, shadow polish

**2.1 Smooth geometry**
In `createCardGeometry()` raise `curveSegments: 8 → 16` and `bevelSegments: 3 → 4`.
Risk: the cap-UV remap relies on a fixed `capVertexCount = 204`. Changing `curveSegments` changes
the cap vertex count. **This must be recomputed, not hard-coded.** Design change: derive the cap
vertex count from the geometry instead of the magic number, so the UV remap and material groups
stay correct when segment counts change. Approach: ExtrudeGeometry emits the two caps first; compute
cap vertex count as `(shapePointCount)` per cap from the triangulated shape, or more robustly,
detect the cap range by z-position (cap verts sit at the min/max z before bevel). Safer concrete
plan: compute `capVertexCount` from `geometry` by counting vertices whose |z| is at the cap plane,
or read it from the generated groups. Validated at runtime with an assertion in dev.

**2.2 Anti-aliasing (SMAA)**
Add `@react-three/postprocessing` (one new dependency) and wrap the scene in an `<EffectComposer>`
with an `<SMAA>` pass. SMAA cleans the crawling thin features (foil thread, rule line, card edge)
better than MSAA alone at a given DPR.
- Risk: EffectComposer on a transparent canvas needs care — enable `alpha` and ensure the composer
  preserves transparency (`EffectComposer` with `enableNormalPass={false}`, and a transparent clear).
- Fallback: if transparency with the composer proves troublesome, raise DPR and rely on MSAA; SMAA
  is the preferred path. This tradeoff is noted so we can bail without blocking Tiers 1/3.

**2.3 Shadow polish**
Improve the flat `shadowFragmentShader` plane:
- Soften the falloff (wider smoothstep), add a slight vertical squash already present, and reduce
  harshness so it reads as an ambient contact shadow.
- Optionally add a second, larger and fainter shadow plane for a soft penumbra.
This stays a cheap shader plane (no shadow-map cost), consistent with the current approach.

### Tier 3 — Surface realism

**3.1 Procedural normal / micro-roughness map**
Generate a subtle normal map in-canvas (consistent with `id-card-textures.ts` philosophy — no
binary assets). A low-amplitude value-noise height field converted to a normal map, tiled, applied
to the shell `MeshPhysicalMaterial` via `normalMap` with a small `normalScale` (e.g. 0.15–0.25).
This breaks up the perfectly flat plastic and makes the clearcoat highlight shimmer realistically.
- Added to `id-card-textures.ts` as an exported `getCardSurfaceNormalMap()` returning a
  `THREE.CanvasTexture` (wrapS/wrapT = Repeat), created once and cached like the faces.
- The face artwork is unaffected (normal map applies only to the shell material group).

**3.2 Clearcoat highlight**
Strengthen the shell `MeshPhysicalMaterial` clearcoat so a specular highlight tracks the
environment/lights as the card rotates:
- raise `clearcoat` (0.2 → ~0.6), set `clearcoatRoughness` low-ish (~0.25),
- apply the normal map (3.1),
- ensure `envMapIntensity` on the shell is set so the clearcoat picks up the Lightformers.

**3.3 drei soft contact shadow (optional upgrade over 2.3)**
Optionally replace the shader-plane shadow with drei `<AccumulativeShadows>` + `<RandomizedLight>`
or `<ContactShadows>` for a physically softer ground shadow.
- `<ContactShadows>` is the cheaper choice and fits a floating card. Decision: **use
  `<ContactShadows>`** (blur, opacity, far tuned) if it composites cleanly on the transparent
  canvas; otherwise keep the polished shader plane from 2.3. Either satisfies the "grounded" goal.

## Rendering Pipeline (to-be)

```
<Canvas dpr={[1,2]} gl={{ alpha:true, antialias:true }}
        onCreated: ACES tone mapping + sRGB output>
  <Environment resolution={256}>            // inline Lightformers (key/fill/rim)
    <Lightformer .../> x3
  </Environment>
  <ambientLight/> <directionalLight/> x2     // kept, retuned down since env now lights
  <ContactShadows/> (Tier 3.3) OR shadow plane (Tier 2.3)
  <CardRig> -> <FloatingCard>
     shell:  MeshPhysicalMaterial + normalMap + clearcoat + envMapIntensity
     foil:   MeshPhysicalMaterial + envMapIntensity + iridescence (+ shader overlay)
     faces:  MeshBasicMaterial toneMapped:false (unchanged)
     sheen/rule: ShaderMaterials (unchanged)
  <EffectComposer>                           // Tier 2.2
     <SMAA/>
  </EffectComposer>
</Canvas>
```

## Files Affected

- `src/components/floating-id-card-scene.tsx` — Canvas props, tone mapping, Environment +
  Lightformers, material tuning, geometry segment counts + dynamic cap-vertex-count fix,
  EffectComposer/SMAA, shadow changes, normal map wiring.
- `src/components/id-card-textures.ts` — add cached `getCardSurfaceNormalMap()` (Tier 3.1).
- `src/data/id-card-design.ts` — add tuning constants (exposure, env intensity, normalScale,
  clearcoat) so values are centralized and easy to adjust.
- `package.json` — add `@react-three/postprocessing` (Tier 2.2 only).

## Key Risks & Decisions

1. **Hard-coded `capVertexCount = 204`** breaks when `curveSegments` changes. Must be derived
   dynamically (detect cap verts by z-plane or recompute from shape triangulation). Highest-risk
   item; validated with a dev assertion.
2. **Environment network dependency** — avoided by using inline `<Lightformer>`s instead of a CDN
   HDR preset. Zero network, fully offline.
3. **EffectComposer + transparent canvas** — transparency must be preserved. If it fights the alpha
   background, fall back to MSAA + higher DPR and skip SMAA without blocking other tiers.
4. **Performance** — DPR 2 + env + composer costs more. Mobile/reduced-motion already use the CSS
   card, so the cost lands only on capable desktops. Keep DPR upper bound at 2 (not 3).
5. **Fallback integrity** — All changes live inside `HeroIdCardScene`; the `SceneErrorBoundary`
   still catches WebGL failures and shows the CSS card. No change to fallback selection logic.

## Verification Plan

- `npm run build` must pass (type-check + Next build).
- Manual visual check in `npm run dev`: sharper edges, reflective foil, smooth corners, crisp thin
  lines, grounded shadow, moving clearcoat highlight.
- Confirm the card still flips, drags, pauses, and speeds up (no interaction regression).
- Confirm reduced-motion and narrow-viewport paths still render the CSS fallback.
- Confirm WebGL-failure path still falls back (temporarily force the error boundary in dev).

## Implementation Notes (as built)

These decisions were made during implementation and supersede the plan above where they differ.

- **SMAA not added (2.2).** In three.js, renderer tone mapping only applies when drawing to the
  screen, so inside an `EffectComposer` the lit materials would lose ACES. Adding a `ToneMapping`
  effect would also tone-map the card artwork and shift its colors. Anti-aliasing uses the
  documented fallback: MSAA (`antialias: true`) at DPR up to 2. No new dependency was installed.
- **`<ContactShadows>` not used (3.3).** It projects onto a horizontal ground plane, and the camera
  views the card almost level, so that shadow would be nearly edge-on and invisible. The card keeps
  its backdrop shadow plane, now polished: squared falloff plus a second, wider, fainter penumbra.
- **Face surface realism (3.1/3.2).** The shell material only covers the thin edge and bevel, so a
  normal map there alone would barely show. The faces now use `MeshPhysicalMaterial` with the artwork
  in `emissiveMap` (base color black, `toneMapped: false`), so the artwork renders as authored while
  a grained clearcoat adds moving highlights. The shell also gets the normal map and stronger
  clearcoat.
- **Normal map** is generated by `getCardSurfaceNormalCanvas()` in `id-card-textures.ts`, which
  returns a canvas rather than a `THREE.Texture` so that module does not pull three.js into the
  main bundle.
- **Cap vertex count** is read from ExtrudeGeometry's lid group (materialIndex 0). Verified in Node:
  204 vertices at `curveSegments: 8`, 396 at `curveSegments: 16`.
- **Tone mapping** is passed through the Canvas `gl` prop, which R3F applies via `applyProps`.
- All tuning values live in `idCardRendering` in `src/data/id-card-design.ts`.
