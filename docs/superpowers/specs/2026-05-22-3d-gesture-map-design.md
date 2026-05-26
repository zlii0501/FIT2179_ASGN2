# 3D Gesture-Controlled Fire Map — Design Spec

**Date:** 2026-05-22  
**Project:** FIT2179 Black Summer Data Story  
**Status:** Awaiting implementation

---

## Goal

Build a standalone `map3d.html` that renders a 3D low-poly Australia with animated fire flame spikes, controllable via hand gestures captured from the user's webcam. The page uses the same data and dark-theme aesthetic as the main story. Integration into `index.html` is deferred to a later step.

---

## Technology Stack

All dependencies are loaded from CDN — no build step, consistent with the rest of the project.

| Library | Purpose | CDN |
|---|---|---|
| Three.js r160 | 3D scene, camera, renderer | `cdn.jsdelivr.net/npm/three@0.160.0` |
| Three.js OrbitControls | Fallback mouse/touch control | same package, `examples/jsm/controls/` |
| MediaPipe Hands | 21-landmark hand tracking via webcam | `cdn.jsdelivr.net/npm/@mediapipe/hands` |
| MediaPipe Camera Utils | Feeds webcam frames to the model | `cdn.jsdelivr.net/npm/@mediapipe/camera_utils` |

---

## Data Sources

Reuse files already in `data/`:

| File | Used for |
|---|---|
| `data/fire_sample_map.csv` | Fire point positions (lat, lon) and FRP intensity |
| `data/australia_states.geojson` | Coastline boundary for the base terrain shape |

Fire points are subsampled at load time (max ~3,000 points) to keep frame rate stable. FRP values are log-scaled before driving flame height, so extreme outliers (11,000 MW) don't dominate.

---

## Architecture

```
map3d.html
├── <video> (hidden) — webcam feed for MediaPipe
├── <canvas> (overlay) — optional: draw hand landmark debug dots
├── <canvas> (Three.js) — the 3D scene
└── <script>
    ├── scene.js logic (inline)
    │   ├── buildTerrain()      — low-poly Australia mesh
    │   ├── buildFlames()       — instanced flame geometries
    │   ├── animateFlames(t)    — noise-based sway each frame
    │   └── render loop
    └── gesture.js logic (inline)
        ├── initCamera()        — starts webcam + MediaPipe
        ├── onResults(results)  — called each frame by MediaPipe
        ├── detectPinch()       — thumb tip ↔ index tip distance
        └── detectOrbit()       — palm centre screen position
```

Everything lives in one `map3d.html` file (inline `<script>`) to stay consistent with the project's zero-module-bundler approach.

---

## Terrain

### Shape
Load `australia_states.geojson`, project each coordinate with a simple Mercator transform into a flat [-1, 1] normalised space. Triangulate the outline using a grid-based approach: fill a regular grid inside the bounding box, discard points outside the coastline polygon (point-in-polygon test), then run Delaunay triangulation on the remaining grid points using a ~100-line inline Bowyer-Watson implementation (no extra CDN dependency).

### Low-poly style
After triangulation, randomly perturb interior vertex heights using a seeded noise function (1–3 octave simplex). This creates the faceted, angled look characteristic of low-poly terrain without needing real DEM elevation data. Mountain-like regions (Great Dividing Range along the east coast) are biased higher by adding a gaussian ridge along the correct longitude band (~148–153°E).

### Colouring
Each triangle face is flat-shaded and coloured by average vertex height:

| Height range | Colour | Represents |
|---|---|---|
| –0.05 → 0.05 | `#1a3a2a` dark green | Coastal plains |
| 0.05 → 0.25 | `#2a5038` mid green | Low hills |
| 0.25 → 0.55 | `#3d6e4a` | Highlands |
| 0.55 → 1.0 | `#5a7a4a` + `#8a9a70` | Peaks |

Terrain is surrounded by a dark ocean plane (`#060a12`) slightly below y=0.

---

## Flame Animation

### Geometry
At load time, fire points are sorted by FRP descending and the top **1,000** are rendered as flames (lower-FRP detections are shown as flat coloured dots instead). Each rendered flame gets its own `THREE.BufferGeometry` — a tapered cone with 8 radial sides and 6 height segments (48 vertices). Base radius scales with `log(frp) * 0.008`, height scales with `log(frp) * 0.04`.

Per-flame `BufferGeometry` (not `InstancedMesh`) is necessary because the wavy sway deforms vertices differently on each flame. With 1,000 flames × 48 vertices = 48,000 vertex updates per frame, this is comfortably within GPU bandwidth on a mid-range laptop.

### Wavy sway (Option C from brainstorming)
Each frame, for each height segment `s` of each flame `i`:

```
sway_x = A · sin(freq · s/totalSegs · t + phase_i) · (1 – s/totalSegs)^0.5 · frp_scale
sway_z = A · cos(freq · s/totalSegs · t · 0.7 + phase_i + π/3) · (1 – s/totalSegs)^0.5 · frp_scale
```

- `A = 0.012` (sway amplitude in world units)
- `freq = 3.5` (oscillation frequency)
- `phase_i` is unique per flame (seeded from index) to prevent synchronised movement
- The `(1 – s/totalSegs)^0.5` taper ensures the base stays anchored and the tip sways most

### Colour gradient
Vertex colour along the flame height:

| Position | Colour |
|---|---|
| Base | `#7f1d1d` (dark red) |
| 40% | `#ef4444` (red) |
| 70% | `#f97316` (orange) |
| 90% | `#fbbf24` (yellow) |
| Tip | `rgba(251,191,36,0)` transparent |

A point light (`PointLight`, colour `#f97316`, intensity ∝ total FRP in region) is added above the densest fire cluster (NSW coast) for ambient warmth.

---

## Camera & Initial View

```
camera type:        PerspectiveCamera, FOV 50°
initial position:   x=0, y=1.8, z=2.5  (looking down at ~40° tilt)
look-at target:     centre of Australia (0, 0, 0)
near / far clip:    0.1 / 100
```

Mouse/touch fallback uses Three.js `OrbitControls` (enabled when no hand is detected).

---

## Hand Gesture Controls

### Setup
A hidden `<video>` feeds webcam frames to `@mediapipe/hands`. The model runs at up to 30 fps, returning 21 normalised (x, y, z) landmarks per detected hand.

### Gesture 1 — Zoom (pinch)
Track the Euclidean distance between landmark 4 (thumb tip) and landmark 8 (index finger tip) in normalised screen space:

```
pinch_dist = √((lm4.x – lm8.x)² + (lm4.y – lm8.y)²)
```

- When `pinch_dist < 0.07`: user is pinching → record as "pinch active"
- Each frame while pinch is active, compare current distance to previous frame distance
- `camera.position.multiplyScalar(1 + Δpinch · k_zoom)` where `k_zoom = 4`
- Camera distance is clamped to [1.2, 6.0]

### Gesture 2 — Orbit (open palm)
When `pinch_dist > 0.15` (open hand), track the palm centre (landmark 9, middle finger MCP) position:

```
Δazimuth   += (palm.x – prev_palm.x) · k_orbit_h   // k_orbit_h = 3.5
Δelevation += (palm.y – prev_palm.y) · k_orbit_v   // k_orbit_v = 2.0
```

Camera orbit is implemented by updating spherical coordinates and converting to Cartesian. Elevation is clamped to [5°, 85°] to prevent flipping.

### Smoothing
All gesture values pass through an exponential moving average (`alpha = 0.25`) before being applied to the camera. This eliminates jitter from MediaPipe's per-frame landmark noise.

### Webcam UI
A small `<div>` in the bottom-right corner shows the live webcam feed (100×75 px) so users can see their hand position. A status badge shows: `● Detecting` / `✋ Orbit` / `🤏 Zoom`.

---

## Visual Integration with Main Site

`map3d.html` inherits the same CSS custom properties as the main site (dark background `#111827`, text `#e8c9a0`, accent `#c0392b`). The page is self-contained but visually consistent.

A back link `← Return to story` in the top-left navigates to `index.html`.

---

## Later: Integration into index.html

When ready to integrate:
1. Add a **Chapter 5 · 3D View** section after Chapter 4 in `index.html`
2. The Three.js scene and MediaPipe initialisation move into a new `js/map3d.js`
3. The scene only initialises when the section scrolls into view (IntersectionObserver), to avoid loading the webcam before the user reaches it
4. The webcam permission prompt appears with a user-facing explanation panel

---

## File Deliverables

```
map3d.html          — the standalone 3D page (~400 lines)
```

No new data files. No new CSS files. No npm packages.

---

## Success Criteria

- [ ] Australia low-poly terrain loads and is recognisable
- [ ] Fire points visible as coloured flame spikes, height proportional to FRP
- [ ] Flame sway animation runs at ≥30 fps on a mid-range laptop
- [ ] Pinch gesture zooms camera in/out
- [ ] Open-palm movement orbits the camera
- [ ] Falls back to mouse drag / scroll wheel when no hand is detected
- [ ] Visual style matches the dark theme of the main data story
