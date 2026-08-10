"""The snapshot CLI and the viewer must agree about what a theme IS.

They cannot share a constant -- one is Python, the other JavaScript -- so they agree by
this test instead. It reads the viewer's own preset table and asserts the Python side
knows the same ids.

This is not hypothetical. `WORKBENCH_RENDER_THEME_IDS` held only the legacy id
`"workbench"`, while the viewer's presets are `workbench-light` and `workbench-dark`. The
browser resolves all three to the same theme (an explicit back-compat alias), so the
PICTURE was right -- but that set also decides a render's default dimensions, so asking for
the viewer's real preset by name rendered at 1200x900 where the legacy id rendered at
1600x1200. Identical theme, different image, no warning.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from tests.python.support.paths import add_repo_path, repo_path

add_repo_path("packages/cadgen/src")

from cadgen.snapshot_core import (  # noqa: E402
    DEFAULT_RENDER_THEME_ID,
    DISPLAY_OPTION_KEYS,
    WORKBENCH_RENDER_THEME_IDS,
)

THEME_SETTINGS_JS = Path(repo_path("packages/cadjs/src/common/themeSettings.js"))
DISPLAY_SETTINGS_JS = Path(repo_path("packages/cadjs/src/common/displaySettings.js"))


def _js_source() -> str:
    return THEME_SETTINGS_JS.read_text(encoding="utf-8")


def _preset_ids() -> set[str]:
    """Every id in the viewer's THEME_PRESETS table."""
    source = _js_source()
    start = source.index("export const THEME_PRESETS")
    end = source.index("export const DEFAULT_THEME_PRESET_ID", start)
    return set(re.findall(r'id:\s*"([^"]+)"', source[start:end]))


def _viewer_default_preset_id() -> str:
    match = re.search(r'export const DEFAULT_THEME_PRESET_ID\s*=\s*"([^"]+)"', _js_source())
    assert match, "themeSettings.js no longer declares DEFAULT_THEME_PRESET_ID"
    return match.group(1)


def _viewer_display_keys() -> set[str]:
    """The top-level settings in the viewer's Display tab."""
    source = DISPLAY_SETTINGS_JS.read_text(encoding="utf-8")
    start = source.index("export const DEFAULT_DISPLAY_SETTINGS")
    end = source.index("});", start)
    return set(re.findall(r"^\s*(\w+):", source[start:end], flags=re.MULTILINE))


class DisplayParityTests(unittest.TestCase):
    """`--display` is meant to be ALL of the viewer's Display tab in one option. A setting
    the viewer grows and the CLI cannot express is the failure this catches."""

    def test_every_viewer_display_setting_is_expressible(self):
        missing = _viewer_display_keys() - DISPLAY_OPTION_KEYS
        self.assertEqual(
            set(),
            missing,
            f"the viewer's Display tab has {sorted(missing)}, which --display cannot carry",
        )

    def test_it_accepts_nothing_the_viewer_does_not_have(self):
        # `projection` is the deliberate exception: it is a THEME trait that --display may
        # override for a one-off render, which the CLI help states.
        extra = DISPLAY_OPTION_KEYS - _viewer_display_keys() - {"projection"}
        self.assertEqual(set(), extra, f"--display accepts unknown key(s): {sorted(extra)}")


class ThemeParityTests(unittest.TestCase):
    def test_the_snapshot_default_is_the_viewers_default_preset(self):
        self.assertEqual(
            _viewer_default_preset_id(),
            DEFAULT_RENDER_THEME_ID,
            "a snapshot with no --theme must render the theme the viewer opens with",
        )

    def test_the_snapshot_default_is_a_real_preset(self):
        # The bare "workbench" survives only as a browser-side alias; the CLI must name an
        # id the viewer's own table actually contains.
        self.assertIn(DEFAULT_RENDER_THEME_ID, _preset_ids())

    def test_every_workbench_preset_counts_as_the_workbench_theme(self):
        # This set decides default render dimensions. A workbench preset missing from it
        # renders at a different size than its siblings for no stated reason.
        workbench_presets = {pid for pid in _preset_ids() if pid.startswith("workbench")}
        self.assertTrue(workbench_presets, "the viewer has no workbench presets to compare")
        missing = workbench_presets - WORKBENCH_RENDER_THEME_IDS
        self.assertEqual(
            set(),
            missing,
            f"viewer workbench preset(s) {sorted(missing)} are not in "
            "WORKBENCH_RENDER_THEME_IDS, so they render at a different default size",
        )

    def test_it_claims_no_id_the_viewer_does_not_have(self):
        # The legacy "workbench" alias is allowed; anything else would be a typo that
        # silently changes a render's size.
        unknown = WORKBENCH_RENDER_THEME_IDS - _preset_ids() - {"workbench"}
        self.assertEqual(set(), unknown, f"unknown theme id(s): {sorted(unknown)}")


if __name__ == "__main__":
    unittest.main()
