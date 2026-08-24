import test from "node:test";
import assert from "node:assert/strict";

import { buildDxfDrawingLineGroups } from "./buildDrawingLines.js";

function xRange(positions) {
  const xs = [];
  for (let i = 0; i < positions.length; i += 3) {
    xs.push(positions[i]);
  }
  return [Math.min(...xs), Math.max(...xs)];
}

function firstGroup(arcs) {
  const out = buildDxfDrawingLineGroups({ geometry: { arcs, lines: [], circles: [] } });
  return out.layers[0];
}

// parseDxf and drawing_render.py both emit startAngleDeg/sweepAngleDeg.
// Reading only startAngle/endAngle left both at 0, so every arc swept a
// full turn and drew a complete circle.
test("a quarter arc in parser keys stays a quarter arc", () => {
  const group = firstGroup([
    { layer: "DIMS", center: [0, 0], radius: 10, startAngleDeg: 0, sweepAngleDeg: 90 },
  ]);
  const [minX, maxX] = xRange(group.positions);

  assert.ok(minX >= -0.001, `expected the arc to stay in x >= 0, got minX ${minX}`);
  assert.ok(Math.abs(maxX - 10) < 0.001);
});

test("a full circle in parser keys still closes", () => {
  const group = firstGroup([
    { layer: "DIMS", center: [0, 0], radius: 10, startAngleDeg: 0, sweepAngleDeg: 360 },
  ]);
  const [minX, maxX] = xRange(group.positions);

  assert.ok(Math.abs(minX + 10) < 0.001);
  assert.ok(Math.abs(maxX - 10) < 0.001);
});

test("the legacy start/end angle shape is still honoured", () => {
  const group = firstGroup([
    { layer: "DIMS", center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
  ]);
  const [minX, maxX] = xRange(group.positions);

  assert.ok(minX >= -0.001);
  assert.ok(Math.abs(maxX - 10) < 0.001);
});

test("an arc with no angles at all still yields a closed circle", () => {
  const group = firstGroup([{ layer: "DIMS", center: [0, 0], radius: 10 }]);
  const [minX, maxX] = xRange(group.positions);

  assert.ok(Math.abs(minX + 10) < 0.001);
  assert.ok(Math.abs(maxX - 10) < 0.001);
});
