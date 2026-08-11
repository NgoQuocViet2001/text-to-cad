# F-14D part-builder brief

Read this in full before writing any geometry. It is the contract every part
module obeys so the aircraft reads as ONE aeroplane instead of a parts bin.

## The aircraft

Grumman F-14D Super Tomcat. **Wings at 20 degrees, canopy closed, gear down, on
the deck.** Clean airframe — empty pylon stations, no ordnance, no external
stores. Mid-1990s low-vis Tactical Paint Scheme.

## Repo / commands

Repo root (a git worktree — use this path, not the main checkout):

```
/Users/jakefitzgerald/robots/text-to-cad/.claude/worktrees/f14d-tomcat-cad-b6e8ce
```

Python: `/Users/jakefitzgerald/robots/text-to-cad/.venv/bin/python`

Run everything **from the repo root**:

```bash
# build + render YOUR module in the context of the airframe skin
.venv/bin/python models/renders/f14d/render/part.py <mod> --views fq,top,side,rq
```

Then `Read` the printed PNG paths and **look at your work**. Iterate on renders,
not on imagination. Add `--solo` to drop the airframe context, `--mode
wireframe` or `--mode transparent` for interference checks, and `--size
assembly-large` is already the default.

Do **NOT** set `CADGEN_WARM=1`.

## Frame and geometry (from `f14_parts/geometry.py` — import, never retype)

```
+X aft (nose at X=0)   +Y port/left   +Z up   ground at Z=0
Units are MILLIMETRES.  G.M == 1000.0 converts metres.
```

The waterline is the **engine axis**, at `G.WATERLINE` (1.780 m) above the
ground. Everything in `geometry.py` that says "z" is relative to that waterline;
`airframe.py` applies one transform (`Location((0,0,WATERLINE),(0,GROUND_PITCH,0))`)
to lift the model onto its gear. **Your module must apply the same transform**
— use `from f14_parts.airframe import stance` and wrap your finished group.

| | |
|---|---|
| length / span @20° / height | 19.110 m / 19.545 m / 4.880 m |
| forebody max half-width | 0.86 m at the cockpit |
| nacelle axis | `G.Y_NACELLE` = ±1.457 m (at the nozzle), ±1.330 m at the inlet |
| nacelle radius | ~0.70 m mid-body, 0.585 m at the nozzle exit |
| inlet cowl walls | outer `G.Y_INLET_OUTER` 1.706 m, inner 0.950 m, fuselage side 0.820 m |
| wing pivot | `G.X_PIVOT` 9.630 m, `G.Y_PIVOT` ±1.320 m |
| wing/glove seal | `G.Y_WING_ROOT` ±2.240 m |
| glove LE sweep | `G.GLOVE_LE_SWEEP` 69.2°, centreline intercept `G.X_GLOVE_LE_ROOT` |
| fin | root `G.X_FIN_LE`..`G.X_FIN_TE`, `G.Y_FIN` ±1.490 m, cant `G.FIN_CANT` 5.0° outward |
| stabilator | pivot `G.X_STAB_PIVOT`, `G.Y_STAB_PIVOT` ±1.400 m, span 9.970 m |
| gear | nose `G.X_NOSE_GEAR` 3.120 m, main `G.X_MAIN_GEAR` 10.640 m, track 2.010 m |

**Query the surface, never guess a coordinate.** If your part touches the
airframe, place it against these functions so it stays attached when the surface
is tuned:

- `G.forebody(x)` → `(half_width, top_z, bottom_z)`
- `G.nacelle(x)` → `(y_axis, r_lateral, r_vertical, axis_z)`
- `G.pancake(x)` → `(top_z, bottom_z)` of the flat tunnel
- `G.canopy_lobe(x)` → `(half_width, top_z)` of the canopy/spine bubble
- `G.glove_le_x(y)`, `G.glove_outer_y(x)`, `G.glove_camber_z(x, y)`
- `G.wing_tip_xy(sweep, side)`, `G.wing_span(sweep)`
- `sections.surfaces(x, y)` → the blended `(top_z, bottom_z)` of the SKIN at any
  point. **This is the authoritative "where is the skin" query.** Use it to sit
  a fairing, antenna or door flush on the surface.
- `sections.outer_half_width(x)` → the skin silhouette half-width.

## Module contract

Write exactly one file: `models/renders/f14d/f14_parts/<mod>.py`

```python
from build123d import ...
from f14_parts import geometry as G
from f14_parts import sections as SEC
from f14_parts.airframe import stance
from f14_parts.context import group, mirror_pair, place, section_frame
from f14_parts import palette as P


def build():
    """Return ONE labelled group Compound, already in world position."""
    kids = [...]
    return stance(group("<mod>", kids))
```

Rules that are not negotiable — each is a real failure mode in this repo:

1. **Leaves carry colour, groups do not.** Colour on a group compound is
   silently ignored by the render package. Use `P.style(shape, "label", P.GREY_DARK)`
   on every leaf.
2. **Colours are authored as sRGB hex** via `palette`. Never write raw float
   triples — the renderer treats channels as *linear* RGB, so `0.5` shows as
   `#BCBCBC`.
3. **`Compound(children=...)` reparents.** The same shape object cannot appear
   in two compounds. Build a fresh shape per occurrence, or use
   `cadgen.compound_from_instances(name, [(prototype, Location, name), ...])`
   for anything repeated ≥4× (petals, rivets, fasteners) — `part.moved()` in a
   loop deep-copies the whole shape graph and is very slow.
4. **`Compound(obj=[...])` without `children=` collapses to ONE occurrence.**
   Always pass `children=`.
5. **No 3D fillets after booleans.** OCC segfaults uncatchably on this geometry
   class. Build roundness into 2D profiles before extruding/lofting, or use
   `RectangleRounded` / sketch-vertex fillets. If you must try a 3D fillet, wrap
   it and fall back to the unfilleted solid.
6. **Overshoot boolean cutters** ~1 mm past both faces. Coplanar tool/target
   faces are a classic kernel failure.
7. **Never use `Plane.rotated()`** for a swept or twisted section — it composes
   in WORLD axes and silently produces a valid solid of the wrong shape. Use
   `context.section_frame(origin, sweep_deg, twist_deg, side)`.
8. **Multi-tool booleans go in ONE list operand**: `body - [a, b, c]`, never
   `body - a - b - c`. Batch tool families so each batch is internally disjoint.
9. Label leaves `role:placement`, e.g. `nozzle_petal:port_04`. No spaces.

### Lessons already paid for on this model — do not re-learn them

- **A closed lobe that ends inside the body is a cliff.** Any closed convex
  profile meets its silhouette on a vertical tangent. If your part has to merge
  into a neighbour, overlap them and cut the feature back in; do not butt them.
- **Lofts match sections BY INDEX.** If you loft varying-width sections, keep
  the sample count fixed AND feature-aligned, or the surface twists.
  See `sections.rails()`.
- **`smoothstep` between control points makes a staircase** (zero slope at both
  ends of every interval). Use `G._curve()`, which is monotone cubic.

## Panel lines, fasteners and how detail actually reads

At 19 m rendered to 1920 px, **1 pixel ≈ 10 mm**. So:

- A scribed panel groove is sub-pixel and cannot read by shading. Panel lines
  read because the **edge overlay draws feature edges** — so a shallow groove
  (3–5 mm deep, 8–12 mm wide) or a separate abutting panel body reads correctly
  as a fine dark line. Cut grooves as ONE batched multi-tool subtract.
- Individual rivets are ~0.4 px and will not read at aircraft scale, but they DO
  read in close-up part renders. Model fastener rows as small additive domes via
  `compound_from_instances` — **never** as thousands of boolean cuts.
- Put panel lines where the structure is: along frames and stringers, around
  every access hatch and door, along the spine, around the gun bay, the avionics
  bays, the gear bays, the fuel dump area. Not decoratively.

## Aesthetic rubric (priority order — this is what you are judged on)

1. **PLANFORM.** The top-down silhouette is the signature.
2. **Blending.** Glove into fuselage, nacelle into pancake, fin root into
   nacelle — continuous surface transitions, never a seam with a fillet dropped
   in.
3. Nacelle cross-section evolves correctly from rectangular inlet to round
   nozzle with no lofting artefacts.
4. Panel lines and rivet rows dense, correctly placed, following the structure.
5. **Gear bays deep and full.** Empty rectangular boxes kill realism instantly.
6. Canopy: correct bubble curvature, frame thickness, glass that reads thick.
7. Nozzle petals individually modelled with correct overlap; actuator ring fully
   resolved.
8. Twin tail cant exact and identical both sides.
9. Zero faceting, zero missing fillets, zero unblended intersections.

**Wherever beauty and accuracy-to-the-inch conflict, choose beauty.** This is
not an engineering exercise. But it is a carrier aircraft, not a show car —
aggressively purposeful and slightly brutal. Clean but not sterile.

## Validation before you report done

- `render/part.py <mod>` exits 0.
- You have LOOKED at renders from at least 4 views and iterated.
- Nothing of yours interpenetrates the airframe skin unless it is meant to —
  query `SEC.surfaces(x, y)` to check.
- Both sides are mirror images (use `mirror_pair`).
- Report: the module path, what you built, the render paths, and anything you
  could not resolve.
