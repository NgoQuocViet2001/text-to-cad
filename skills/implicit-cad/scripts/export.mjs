#!/usr/bin/env node
// The skill's export command. Runs the same builder cadgen spawns
// (packages/cadjs/bin/implicit-export.mjs), which is esbuilt self-contained into this
// skill's runtime -- so this needs no node_modules and no vendored implicitjs tree.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const builder = path.join(scriptsDir, "packages", "cadjs", "bin", "implicit-export.mjs");

if (!fs.existsSync(builder)) {
  process.stderr.write(
    `Missing implicit export builder at ${builder}. Restore the development symlink layout or rebuild the production skill bundle.\n`
  );
  process.exit(1);
}

const completed = spawnSync(process.execPath, [builder, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
});

process.exitCode = completed.status ?? 1;
