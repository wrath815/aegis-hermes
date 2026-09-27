// Build the AEGIS dashboard plugin: src/ -> dist/index.js (IIFE) + dist/style.css.
//
//   npm --prefix plugins/aegis/dashboard install   (once: esbuild + three)
//   npm --prefix plugins/aegis/dashboard run build
//
// React is never bundled: `react` and `react/jsx-runtime` are aliased to
// src/sdk.ts and src/jsx-runtime.ts, which hand back the host dashboard's React
// from window.__HERMES_PLUGIN_SDK__. three.js is bundled
// (minified, tree-shaken) so the orb works offline and needs no CDN.
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const vendoredThree = join(here, "vendor", "three.module.js");
const alias = {
  "react/jsx-runtime": join(here, "src", "jsx-runtime.ts"),
  react: join(here, "src", "sdk.ts"),
};
// Prefer the installed package; fall back to a vendored copy for offline builds.
if (!existsSync(join(here, "node_modules", "three")) && existsSync(vendoredThree)) alias.three = vendoredThree;

const watch = process.argv.includes("--watch");
const common = { absWorkingDir: here, logLevel: "info", legalComments: "eof" };

await build({
  ...common,
  entryPoints: ["src/index.tsx"],
  outfile: "dist/index.js",
  bundle: true,
  format: "iife",
  target: ["chrome110", "firefox115", "safari16"],
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  jsx: "automatic",
  alias,
});

await build({ ...common, entryPoints: ["src/style.css"], outfile: "dist/style.css", bundle: true, minify: !watch });
