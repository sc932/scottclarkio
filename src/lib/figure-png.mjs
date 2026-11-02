// figure-png.mjs — rasterize the DOWNLOADABLE (attributed) SVG of a house
// figure to PNG at build time (Scott, 2026-11-02: "when you click on an image
// to download it should offer both svg and png formats. Many sites prefer
// png."). resvg — already the OG-card rasterizer — renders the attributed SVG
// at FIGURE_PNG_SCALE x its user units (the same 2x the committed PNG twins
// use; vault diagram skill render_png.py) with the fonts VENDORED under
// src/assets/figures/fonts/ and system fonts OFF (ubuntu-latest has no IBM
// Plex and no DejaVu obliques). The AIO gate recomputes every PNG through this
// same function and compares bytes — a SAME-MACHINE proof (the build and its
// gate run in one job); that a laptop and CI agree too is a property of the
// vendored faces + resvg's software rasterizer, held in practice, not by a
// tooth. Shared by the endpoint (src/pages/figures/[slug]/[name].png.ts) and
// the gate (scripts/aio-check.mjs).
//
// Two things resvg-js 2.6.2 does NOT do that the committed Chrome twins did,
// both emulated by prepareForResvg() on the SVG text (the SVG download itself
// is untouched; round-1 seats, 2026-11-02):
//  - `orient="auto-start-reverse"` on a <marker> (SVG 2): resvg draws the
//    START marker un-reversed (a y-axis arrowhead pointing right). Every such
//    marker becomes orient="auto" plus a twin marker rotated 180 degrees about
//    its viewBox centre (the reference point mirrored with it), and each
//    marker-start that names the original names the twin.
//  - the Linux fontconfig aliases: Chrome drew `Helvetica, Arial, sans-serif`
//    lists in the metric-compatible Nimbus/Liberation faces; resvg has no
//    aliasing and no working generic-family options (`monospace`, `sans-serif`
//    and the sansSerifFamily/monospaceFamily knobs all fall to
//    defaultFontFamily — the tree seat's probe). A list whose FIRST family is
//    Helvetica or Arial gets "Liberation Sans" (OFL, Arial-metric; vendored)
//    prepended; every other list names a vendored family first (the AIO gate
//    holds that). A weight or style a family lacks renders in that family's
//    nearest loaded face (resvg does not synthesize bold or oblique).
import { Resvg } from "@resvg/resvg-js";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export const FIGURE_PNG_SCALE = 2;
// Resolved from the project root: the endpoint is bundled before prerender,
// so import.meta.url-relative paths would point into dist/.prerender chunks
// (build cwd = project root — the og.png.ts assumption).
export const FIGURE_FONT_DIR = resolve("src/assets/figures/fonts");
/** Families resvg cannot resolve by name here, and what each becomes (the first family of a list only). */
export const FONT_ALIASES = { Helvetica: "Liberation Sans", "Helvetica Neue": "Liberation Sans", Arial: "Liberation Sans" };

/** The vendored font files, sorted (a stable load order = stable bytes). */
export function figureFontFiles(dir = FIGURE_FONT_DIR) {
  const files = readdirSync(dir)
    .filter((f) => /\.(ttf|otf)$/i.test(f))
    .sort()
    .map((f) => resolve(dir, f));
  if (!files.length) throw new Error(`figure-png: no font files under ${dir}`);
  return files;
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

/** The marker's box: its viewBox, else 0 0 markerWidth markerHeight (SVG defaults 3x3). */
function markerBox(tag) {
  const vb = (attr(tag, "viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every((n) => Number.isFinite(n))) return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  return { x: 0, y: 0, w: Number(attr(tag, "markerWidth") ?? 3), h: Number(attr(tag, "markerHeight") ?? 3) };
}

/**
 * The SVG text resvg renders: auto-start-reverse markers emulated, Helvetica /
 * Arial-first font lists aliased to the vendored Liberation Sans. Pure; the
 * download SVG is never rewritten. Exported so the gate can pin both seams.
 */
export function prepareForResvg(svg) {
  let out = svg;
  // 1. auto-start-reverse: a reversed twin per marker, marker-start re-pointed.
  const reversed = new Map(); // id -> twin id
  out = out.replace(/<marker\b[^>]*\borient="auto-start-reverse"[^>]*>[\s\S]*?<\/marker>/g, (m) => {
    const open = m.match(/<marker\b[^>]*>/)[0];
    const id = attr(open, "id");
    if (!id) return m.replace(/\borient="auto-start-reverse"/, 'orient="auto"');
    const box = markerBox(open);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const refX = Number(attr(open, "refX") ?? 0);
    const refY = Number(attr(open, "refY") ?? 0);
    const twinId = `${id}-fig-rev`;
    reversed.set(id, twinId);
    const forward = m.replace(/\borient="auto-start-reverse"/, 'orient="auto"');
    const inner = m.slice(open.length, m.length - "</marker>".length);
    let twinOpen = open.replace(/\borient="auto-start-reverse"/, 'orient="auto"').replace(/\bid="[^"]*"/, `id="${twinId}"`);
    twinOpen = twinOpen.replace(/\brefX="[^"]*"/, `refX="${2 * cx - refX}"`).replace(/\brefY="[^"]*"/, `refY="${2 * cy - refY}"`);
    if (!/\brefX=/.test(twinOpen)) twinOpen = twinOpen.replace(/<marker\b/, `<marker refX="${2 * cx - refX}"`);
    if (!/\brefY=/.test(twinOpen)) twinOpen = twinOpen.replace(/<marker\b/, `<marker refY="${2 * cy - refY}"`);
    const twin = `${twinOpen}<g transform="rotate(180 ${cx} ${cy})">${inner}</g></marker>`;
    return forward + twin;
  });
  if (reversed.size) {
    out = out.replace(/\bmarker-start="url\(#([^)"]+)\)"/g, (m, id) => (reversed.has(id) ? `marker-start="url(#${reversed.get(id)})"` : m));
    out = out.replace(/marker-start:\s*url\(#([^)'"]+)\)/g, (m, id) => (reversed.has(id) ? `marker-start:url(#${reversed.get(id)})` : m));
  }
  // 2. Helvetica / Arial-first lists -> the vendored metric-compatible face first.
  const alias = (list) => {
    const first = list.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    const to = FONT_ALIASES[first];
    return to && !list.includes(to) ? `${to}, ${list}` : list;
  };
  out = out.replace(/\bfont-family="([^"]*)"/g, (m, list) => `font-family="${alias(list)}"`);
  out = out.replace(/font-family:\s*([^;"']+)/g, (m, list) => `font-family:${alias(list)}`);
  return out;
}

/** Render an SVG string to PNG; `width`/`height` are the PNG's pixel size,
 * `pixels` the RGBA buffer (the gate's blankness tooth reads it). */
export function renderFigurePng(svg, { scale = FIGURE_PNG_SCALE, fontDir = FIGURE_FONT_DIR } = {}) {
  const r = new Resvg(prepareForResvg(svg), {
    fitTo: { mode: "zoom", value: scale },
    font: {
      loadSystemFonts: false,
      fontFiles: figureFontFiles(fontDir),
      // The one knob that works in resvg-js 2.6.2: every unresolved family
      // (and every generic keyword) lands here.
      defaultFontFamily: "DejaVu Sans",
    },
    shapeRendering: 2, // geometricPrecision
    textRendering: 2, // geometricPrecision
    imageRendering: 0, // optimizeQuality
  });
  const img = r.render();
  return { png: Buffer.from(img.asPng()), width: img.width, height: img.height, pixels: img.pixels };
}

/** Fraction of pixels that differ from the top-left pixel — a blank render is ~0. */
export function inkFraction(pixels, width, height) {
  const n = width * height;
  if (!n || pixels.length < n * 4) return 0;
  const r0 = pixels[0], g0 = pixels[1], b0 = pixels[2], a0 = pixels[3];
  let ink = 0;
  for (let i = 0; i < n * 4; i += 4) if (pixels[i] !== r0 || pixels[i + 1] !== g0 || pixels[i + 2] !== b0 || pixels[i + 3] !== a0) ink++;
  return ink / n;
}
