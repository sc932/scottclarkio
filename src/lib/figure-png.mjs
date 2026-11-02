// figure-png.mjs — rasterize the DOWNLOADABLE (attributed) SVG of a house
// figure to PNG at build time (Scott, 2026-11-02: "when you click on an image
// to download it should offer both svg and png formats. Many sites prefer
// png."). resvg — already the OG-card rasterizer — renders the attributed SVG
// at FIGURE_PNG_SCALE x its user units (the same 2x the committed PNG twins
// use; vault diagram skill render_png.py) with the fonts VENDORED under
// src/assets/figures/fonts/ and system fonts OFF, so the bytes are the same on
// a laptop and in CI (ubuntu-latest has no IBM Plex and no DejaVu obliques)
// and the AIO gate can recompute every PNG byte-for-byte, exactly as it does
// the SVGs. Shared by the endpoint (src/pages/figures/[slug]/[name].png.ts)
// and the gate (scripts/aio-check.mjs). The figures' own font-family lists
// name DejaVu Sans / Sans Mono (and, on scottclark.io, IBM Plex Sans / Mono);
// Helvetica/Arial-only lists and the generic families resolve to DejaVu Sans.
import { Resvg } from "@resvg/resvg-js";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export const FIGURE_PNG_SCALE = 2;
// Resolved from the project root: the endpoint is bundled before prerender,
// so import.meta.url-relative paths would point into dist/.prerender chunks
// (build cwd = project root — the og.png.ts assumption).
export const FIGURE_FONT_DIR = resolve("src/assets/figures/fonts");

/** The vendored font files, sorted (a stable load order = stable bytes). */
export function figureFontFiles(dir = FIGURE_FONT_DIR) {
  const files = readdirSync(dir)
    .filter((f) => /\.(ttf|otf)$/i.test(f))
    .sort()
    .map((f) => resolve(dir, f));
  if (!files.length) throw new Error(`figure-png: no font files under ${dir}`);
  return files;
}

/** Render an SVG string to PNG; `width`/`height` are the PNG's pixel size. */
export function renderFigurePng(svg, { scale = FIGURE_PNG_SCALE, fontDir = FIGURE_FONT_DIR } = {}) {
  const r = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: {
      loadSystemFonts: false,
      fontFiles: figureFontFiles(fontDir),
      defaultFontFamily: "DejaVu Sans",
      sansSerifFamily: "DejaVu Sans",
      serifFamily: "DejaVu Sans",
      monospaceFamily: "DejaVu Sans Mono",
    },
    shapeRendering: 2, // geometricPrecision
    textRendering: 2, // geometricPrecision
    imageRendering: 0, // optimizeQuality
  });
  const img = r.render();
  return { png: Buffer.from(img.asPng()), width: img.width, height: img.height };
}
