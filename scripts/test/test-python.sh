#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/test/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

LIST_SKILLS_SCRIPT="$REPO_ROOT/scripts/utils/list-skills.sh"

cd "$REPO_ROOT"

# Turn the render-package write-lock assertion into a hard failure for tests. In
# production require_write_lock() only warns -- a missing lock must never be the reason a
# user's build fails -- so CI is the only place the contract is actually enforced.
export CADGEN_STRICT_LOCKS=1

run_python_unittest "cadgen package Python tests" "tests/python/packages/cadgen" "packages/cadgen/src"

while IFS= read -r skill; do
  test_dir="tests/python/skills/$skill"
  if [ -d "$test_dir" ]; then
    # Skills no longer vendor cadgen; they import the distribution. In a checkout that is
    # the repo's own source, so put it on the path rather than depending on whatever the
    # interpreter happens to have installed.
    run_python_unittest "$skill skill Python tests" "$test_dir" \
      "skills/$skill/scripts" "packages/cadgen/src"
  fi
done < <("$LIST_SKILLS_SCRIPT")

run_python_unittest "MoveIt2 server Python tests" "tests/python/viewer/moveit2_server" "viewer/moveit2_server"

# The CAD Viewer backend is cadgen.viewer now, so its tests sit with the rest of the
# cadgen suite. It owns the only cross-process coverage of the generation lock
# (test_artifact.py drives a real second process and SIGKILLs it), which is why it must
# run in CI, and it pins the property that the long-lived server imports without OCP.
run_python_unittest "CAD Viewer backend Python tests" "tests/python/packages/cadgen/viewer" "packages/cadgen/src"
