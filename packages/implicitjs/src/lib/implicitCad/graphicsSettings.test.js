import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_IMPLICIT_GRAPHICS_SETTINGS,
  IMPLICIT_INTERACTION_STEP_BUDGET,
  implicitGraphicsRenderResolutionScale,
  implicitGraphicsRenderSettings,
  normalizeImplicitGraphicsSettings
} from "./graphicsSettings.js";

test("implicit graphics render resolution uses idle or interaction scale", () => {
  const settings = normalizeImplicitGraphicsSettings({
    resolutionScale: 2.5,
    interactionResolutionScale: 0.75
  });

  assert.equal(implicitGraphicsRenderResolutionScale(settings), 2.5);
  assert.equal(implicitGraphicsRenderResolutionScale(settings, { interaction: true }), 0.75);
});

test("implicit graphics render settings reduce shader cost while interacting", () => {
  const settings = {
    resolutionScale: 2.5,
    interactionResolutionScale: 0.75,
    detail: 2,
    shadows: true,
    ambientOcclusion: true,
    rimLight: true
  };

  assert.deepEqual(implicitGraphicsRenderSettings(settings), {
    ...normalizeImplicitGraphicsSettings(settings)
  });
  assert.deepEqual(implicitGraphicsRenderSettings(settings, { interaction: true }), {
    ...normalizeImplicitGraphicsSettings(settings),
    detail: 0.75,
    stepBudget: 96,
    shadows: false,
    ambientOcclusion: false
  });
  assert.equal(
    implicitGraphicsRenderSettings({ ...settings, detail: 0.5, stepBudget: 24 }, { interaction: true }).stepBudget,
    24
  );
});

test("implicit graphics settings fall back to defaults for non-numeric values", () => {
  // `undefined` round-trips through JSON as `null`, and an emptied numeric
  // input arrives as "". Both used to coerce to 0 and clamp to the minimum.
  for (const empty of [null, "", "   ", [], {}, true, undefined, NaN]) {
    const settings = normalizeImplicitGraphicsSettings({
      resolutionScale: empty,
      interactionResolutionScale: empty,
      detail: empty,
      normalSmoothing: empty
    });
    assert.deepEqual(
      {
        resolutionScale: settings.resolutionScale,
        interactionResolutionScale: settings.interactionResolutionScale,
        detail: settings.detail,
        normalSmoothing: settings.normalSmoothing
      },
      {
        resolutionScale: DEFAULT_IMPLICIT_GRAPHICS_SETTINGS.resolutionScale,
        interactionResolutionScale: DEFAULT_IMPLICIT_GRAPHICS_SETTINGS.interactionResolutionScale,
        detail: DEFAULT_IMPLICIT_GRAPHICS_SETTINGS.detail,
        normalSmoothing: DEFAULT_IMPLICIT_GRAPHICS_SETTINGS.normalSmoothing
      },
      `expected defaults for ${JSON.stringify(empty) ?? String(empty)}`
    );
  }

  // A real number, including one written as a string, still applies, and a
  // genuine out-of-range number still clamps.
  assert.equal(normalizeImplicitGraphicsSettings({ resolutionScale: "3" }).resolutionScale, 3);
  assert.equal(normalizeImplicitGraphicsSettings({ resolutionScale: 0 }).resolutionScale, 0.5);
  assert.equal(normalizeImplicitGraphicsSettings({ resolutionScale: 99 }).resolutionScale, 5);
});

test("interaction step budget falls back to the default for non-numeric values", () => {
  for (const empty of [null, "", [], true, undefined]) {
    assert.equal(
      implicitGraphicsRenderSettings({ stepBudget: empty }, { interaction: true }).stepBudget,
      IMPLICIT_INTERACTION_STEP_BUDGET,
      `expected the default budget for ${JSON.stringify(empty) ?? String(empty)}`
    );
  }
  assert.equal(implicitGraphicsRenderSettings({ stepBudget: 24 }, { interaction: true }).stepBudget, 24);
  assert.equal(implicitGraphicsRenderSettings({ stepBudget: 500 }, { interaction: true }).stepBudget, 96);
});
