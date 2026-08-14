#!/usr/bin/env python3
"""Build a DXF's drawing package.

A shim over the `cadgen` distribution named in this skill's requirements.txt. The parser,
the behaviour and the output contract all live in ``cadgen.cli.dxf_artifact``; this file exists so the
skill keeps a stable `scripts/artifact` entrypoint, and so a missing install fails with an
instruction instead of a traceback.
"""

from __future__ import annotations

import sys

# Drawing packages are content-addressed and ezdxf's object ordering depends on hash
# randomization, so a build must be byte-deterministic. Re-exec once with the seed pinned
# rather than hoping the caller set it.
import os

if os.environ.get("PYTHONHASHSEED") != "0":
    os.environ["PYTHONHASHSEED"] = "0"
    os.execv(sys.executable, [sys.executable, *sys.argv])

from pathlib import Path

# Fail fast when the installed cadgen is not the one this skill was published against:
# everything below this line runs INSIDE that install.
try:
    from cadgen.cli import enforce_requirements_pin
except ModuleNotFoundError:
    sys.stderr.write(
        "cadgen is not installed. From the skill directory run:\n"
        "  python -m pip install -r requirements.txt\n"
    )
    raise SystemExit(3)

enforce_requirements_pin(Path(__file__).resolve().parents[2] / "requirements.txt")

from cadgen.cli import dxf_artifact as _cli


if __name__ == "__main__":
    raise SystemExit(_cli.main(sys.argv[1:]))
