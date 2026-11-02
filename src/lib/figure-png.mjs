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
// both emulated by prepareForResvg() on the SVG text — inside TAGS and <style>
// blocks only, never in drawn text (the SVG download itself is untouched;
// rounds 1 and 3, 2026-11-02):
//  - `orient="auto-start-reverse"` on a <marker> (SVG 2): resvg draws the
//    START marker un-reversed (a y-axis arrowhead pointing right). Every such
//    marker becomes orient="auto" plus a twin whose direct children carry a
//    180-degree rotation about the marker's BOX centre (the viewBox, else the
//    markerWidth/Height box) with refX/refY mirrored through it, and every
//    marker-start (or `marker` shorthand, attribute or style, either quote)
//    that names the original names the twin. A refX/refY/markerWidth/Height
//    the emulation cannot read as a plain number (a %, a unit) throws — the
//    build fails rather than ships a NaN. Residual (documented): a CSS rule
//    keyed on the ORIGINAL marker's id (`#m path`) styles the forward marker
//    only; house figures carry no such rules.
//  - the Linux fontconfig aliases: Chrome drew `Helvetica, Arial, sans-serif`
//    lists in Nimbus Sans (Helvetica-metric) / Liberation Sans (Arial-metric);
//    resvg has no aliasing and no working generic-family options (`monospace`,
//    `sans-serif` and the sansSerifFamily/monospaceFamily knobs all fall to
//    defaultFontFamily — the tree seat's probe). A list whose FIRST family is
//    Helvetica / Helvetica Neue / Arial (any case, either quote) gets
//    "Liberation Sans" (OFL, Arial-metric; vendored) prepended; every other
//    list names a vendored family first (the AIO gate holds that per lane).
//    A weight or style a family lacks renders in that family's nearest loaded
//    face (resvg does not synthesize bold or oblique).
import { Resvg } from "@resvg/resvg-js";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export const FIGURE_PNG_SCALE = 2;
// Resolved from the project root: the endpoint is bundled before prerender,
// so import.meta.url-relative paths would point into dist/.prerender chunks
// (build cwd = project root — the og.png.ts assumption).
export const FIGURE_FONT_DIR = resolve("src/assets/figures/fonts");
/** Families resvg cannot resolve by name here (lower-cased), and what each becomes (the first family of a list only). */
export const FONT_ALIASES = { helvetica: "Liberation Sans", "helvetica neue": "Liberation Sans", arial: "Liberation Sans" };
/** Vendored file-name stems → the family name a figure must write. */
const FAMILY_OF_STEM = [["DejaVuSansMono", "DejaVu Sans Mono"], ["DejaVuSans", "DejaVu Sans"], ["IBMPlexMono", "IBM Plex Mono"], ["IBMPlexSans", "IBM Plex Sans"], ["LiberationSans", "Liberation Sans"]];

/** The vendored font files, sorted (a stable load order = stable bytes). */
export function figureFontFiles(dir = FIGURE_FONT_DIR) {
  const files = readdirSync(dir)
    .filter((f) => /\.(ttf|otf)$/i.test(f))
    .sort()
    .map((f) => resolve(dir, f));
  if (!files.length) throw new Error(`figure-png: no font files under ${dir}`);
  return files;
}

/** The families the vendored files serve (from their file names) — what a committed figure may name first. */
export function vendoredFamilies(dir = FIGURE_FONT_DIR) {
  const out = new Set();
  for (const f of figureFontFiles(dir)) {
    const stem = f.split("/").pop();
    const hit = FAMILY_OF_STEM.find(([s]) => stem.startsWith(s));
    if (!hit) throw new Error(`figure-png: ${stem} is not a face this module knows (add its stem to FAMILY_OF_STEM)`);
    out.add(hit[1]);
  }
  return out;
}

const unq = (s) => String(s).trim().replace(/^['"]|['"]$/g, "").trim();
/** An attribute's value, either quote. */
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`))?.slice(1).find((v) => v !== undefined);
const num = (tag, name, dflt) => {
  const v = attr(tag, name);
  if (v === undefined) return dflt;
  if (!/^\s*[-+]?\d*\.?\d+(?:e[-+]?\d+)?\s*$/i.test(v)) throw new Error(`figure-png: marker ${name}="${v}" is not a plain number — the auto-start-reverse emulation cannot mirror it`);
  return Number(v);
};

/** The marker's box: its viewBox, else 0 0 markerWidth markerHeight (SVG defaults 3x3). */
function markerBox(tag) {
  const vb = (attr(tag, "viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every((n) => Number.isFinite(n))) return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  return { x: 0, y: 0, w: num(tag, "markerWidth", 3), h: num(tag, "markerHeight", 3) };
}

/** Apply `fn` to every tag and every <style> block of an SVG string; text nodes stay untouched. */
function mapMarkup(svg, fn) {
  return svg.replace(/<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>/g, (m) => fn(m));
}

const setOrientAuto = (tag) => tag.replace(/\sorient\s*=\s*(?:"auto-start-reverse"|'auto-start-reverse')/, ' orient="auto"');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The SVG text resvg renders: auto-start-reverse markers emulated, Helvetica /
 * Arial-first font lists aliased to the vendored Liberation Sans. Pure; the
 * download SVG is never rewritten. Exported so the gate can pin both seams.
 */
export function prepareForResvg(svg) {
  let out = svg;
  // 1. auto-start-reverse: a reversed twin per marker, the start references re-pointed.
  const reversed = new Map(); // id -> twin id
  out = out.replace(/<marker\b[^>]*>[\s\S]*?<\/marker>/g, (m) => {
    const open = m.match(/<marker\b[^>]*>/)[0];
    if (!/\sorient\s*=\s*(?:"auto-start-reverse"|'auto-start-reverse')/.test(open)) return m;
    const id = attr(open, "id");
    if (!id) return setOrientAuto(m);
    const box = markerBox(open);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const refX = num(open, "refX", 0);
    const refY = num(open, "refY", 0);
    const twinId = `${id}-fig-rev`;
    reversed.set(id, twinId);
    const forward = setOrientAuto(m);
    let inner = m.slice(open.length, m.length - "</marker>".length);
    // the rotation rides each direct child (a wrapping <g> would change `marker > path` selectors)
    const rot = `rotate(180 ${cx} ${cy})`;
    let depth = 0;
    inner = inner.replace(/<\/?[A-Za-z][^>]*>/g, (tag) => {
      if (tag.startsWith("</")) {
        depth--;
        return tag;
      }
      const selfClosing = /\/>$/.test(tag);
      const top = depth === 0;
      if (!selfClosing) depth++;
      if (!top) return tag;
      const t = attr(tag, "transform");
      return t !== undefined
        ? tag.replace(/\stransform\s*=\s*(?:"[^"]*"|'[^']*')/, ` transform="${rot} ${t}"`)
        : tag.replace(/^<([A-Za-z][\w:-]*)/, `<$1 transform="${rot}"`);
    });
    let twinOpen = setOrientAuto(open).replace(/\sid\s*=\s*(?:"[^"]*"|'[^']*')/, ` id="${twinId}"`);
    for (const [name, val] of [["refX", 2 * cx - refX], ["refY", 2 * cy - refY]])
      twinOpen = new RegExp(`\\s${name}\\s*=`).test(twinOpen) ? twinOpen.replace(new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`), ` ${name}="${val}"`) : twinOpen.replace(/<marker\b/, `<marker ${name}="${val}"`);
    return `${forward}${twinOpen}${inner}</marker>`;
  });
  if (reversed.size) {
    const ref = (id) => `url\\(\\s*['"]?#${escRe(id)}['"]?\\s*\\)`;
    out = mapMarkup(out, (tag) => {
      let t = tag;
      for (const [id, twin] of reversed) {
        // marker-start (attribute or CSS declaration, either quote)
        t = t.replace(new RegExp(`(\\smarker-start\\s*=\\s*["']|marker-start\\s*:\\s*)${ref(id)}`, "g"), `$1url(#${twin})`);
        // the `marker` shorthand: the start position names the twin, mid/end keep the forward marker
        t = t.replace(new RegExp(`\\smarker\\s*=\\s*(["'])${ref(id)}\\1`, "g"), ` marker-start="url(#${twin})" marker-mid="url(#${id})" marker-end="url(#${id})"`);
        t = t.replace(new RegExp(`(^|[;\\s"'])marker\\s*:\\s*${ref(id)}`, "g"), `$1marker-start:url(#${twin});marker-mid:url(#${id});marker-end:url(#${id})`);
      }
      return t;
    });
  }
  // 2. Helvetica / Arial-first lists -> the vendored metric-compatible face first (attribute, CSS, either quote, any case).
  const alias = (list) => {
    const first = unq(list.split(",")[0]).toLowerCase();
    const to = FONT_ALIASES[first];
    return to ? `${to}, ${list}` : list;
  };
  out = mapMarkup(out, (tag) =>
    tag
      .replace(/(\sfont-family\s*=\s*)(?:"([^"]*)"|'([^']*)')/g, (m, lead, dq, sq) => (dq !== undefined ? `${lead}"${alias(dq)}"` : `${lead}'${alias(sq)}'`))
      .replace(/(font-family\s*:\s*)([^;}"]+(?:"[^"]*"[^;}"]*)*|[^;}']+(?:'[^']*'[^;}']*)*)/g, (m, lead, list) => `${lead}${alias(list)}`),
  );
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

/** Fraction of pixels in rows [0, rows) that differ from the region's MOST COMMON colour
 * (the background, wherever a title band sits) — a blank drawing is ~0. `rows` defaults
 * to the whole image; the gate passes the drawing's rows (above the attribution band). */
export function inkFraction(pixels, width, height, rows = height) {
  const n = width * Math.min(rows, height);
  if (!n || pixels.length < n * 4) return 0;
  const counts = new Map();
  for (let i = 0; i < n * 4; i += 4) {
    const k = (pixels[i] << 24) | (pixels[i + 1] << 16) | (pixels[i + 2] << 8) | pixels[i + 3];
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let bg = 0;
  for (const c of counts.values()) if (c > bg) bg = c;
  return 1 - bg / n;
}
