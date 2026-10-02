// figure-attribution.mjs — compose the DOWNLOADABLE version of a house SVG
// figure: the committed drawing plus a footer band carrying the CAPTION
// (wrapped, left-aligned — Scott, 2026-10-01: "The download should include the
// caption") and an attribution line (copyright + the figure's deep-link URL,
// bottom-right), plus machine-readable Dublin Core metadata. The inline page copy stays clean; the focus view shows
// the page's inline svg cloned; the DOWNLOAD serves this derivative (built by src/pages/figures/[slug]/[name].svg.ts,
// verified byte-for-byte by the AIO gate through this same function).
//
// Geometry: the footer lives in a NEW band appended below the declared canvas
// (viewBox height grows), so it can never collide with the drawing — the
// diagram lint's text-collision law holds by construction. The band inherits
// the canvas background (the first full-canvas <rect> is extended) and the
// root font-family; type sits at the house annotation floor (#6b7280).

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Parse the root <svg …> tag's viewBox (falls back to width/height). */
export function svgCanvas(raw) {
  const root = raw.match(/<svg\b[^>]*>/);
  if (!root) throw new Error("attributeSvg: no <svg> root");
  const vb = root[0].match(/\bviewBox=["']\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*["']/);
  if (vb) return { root: root[0], x: +vb[1], y: +vb[2], w: +vb[3], h: +vb[4] };
  const w = root[0].match(/\bwidth=["']([\d.]+)["']/)?.[1];
  const h = root[0].match(/\bheight=["']([\d.]+)["']/)?.[1];
  if (!w || !h) throw new Error("attributeSvg: root has neither viewBox nor width/height");
  return { root: root[0], x: 0, y: 0, w: +w, h: +h };
}

/** Footer type size in user units: ~1% of the canvas width, clamped so the
 * line stays legible on narrow figures and quiet on wide ones. */
export const footerFontSize = (w) => Math.min(18, Math.max(11, Math.round(w / 95)));
/** Caption type size: larger than the attribution line (~1.4 % of the width). */
export const captionFontSize = (w) => Math.min(24, Math.max(13, Math.round(w / 70)));

// DejaVu Sans advance widths in 1/1000 em (measured from the box's
// DejaVuSans.ttf with PIL, 2026-10-01 / 10-02): ASCII 32..126, Latin-1
// 0xA0..0xFF, General Punctuation U+2010..U+2026 (dashes, quotes, ellipsis).
// Any other glyph assumes a FULL em, so the wrap errs early and the unpinned
// last line can never overflow the band (round-2 K3 F4).
const DEJAVU_W = [318,401,460,838,636,950,780,275,390,390,500,838,318,361,318,337,636,636,636,636,636,636,636,636,636,636,337,337,838,838,838,531,1000,684,686,698,770,632,575,775,752,295,295,656,557,863,748,787,603,787,695,635,611,732,684,989,685,611,685,390,337,390,838,500,500,613,635,550,635,615,352,635,634,278,278,579,278,974,634,612,635,635,411,521,392,634,592,818,592,592,525,636,337,636,838];
const DEJAVU_LAT1 = [318, 401, 636, 636, 636, 636, 337, 500, 500, 1000, 471, 612, 838, 0, 1000, 500, 500, 838, 401, 401, 500, 636, 636, 318, 500, 401, 471, 612, 969, 969, 969, 531, 684, 684, 684, 684, 684, 684, 974, 698, 632, 632, 632, 632, 295, 295, 295, 295, 775, 748, 787, 787, 787, 787, 787, 838, 787, 732, 732, 732, 732, 611, 605, 630, 613, 613, 613, 613, 613, 613, 982, 550, 615, 615, 615, 615, 278, 278, 278, 278, 612, 634, 612, 612, 612, 612, 612, 838, 612, 634, 634, 634, 634, 592, 635, 592];
const DEJAVU_PUNCT = [361, 361, 636, 500, 1000, 1000, 500, 500, 318, 318, 318, 318, 518, 518, 518, 518, 500, 500, 590, 590, 334, 667, 1000];
const DEJAVU_UNKNOWN = 1000;
/** Rendered width of a string in user units at a given font size (DejaVu Sans). */
export function textWidth(text, fontSize) {
  let u = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c <= 126) u += DEJAVU_W[c - 32];
    else if (c >= 0xa0 && c <= 0xff) u += DEJAVU_LAT1[c - 0xa0];
    else if (c >= 0x2010 && c <= 0x2026) u += DEJAVU_PUNCT[c - 0x2010];
    else u += DEJAVU_UNKNOWN;
  }
  return (u / 1000) * fontSize;
}

/** Greedy word wrap for SVG <text> (no auto-wrap in SVG) by MEASURED width,
 * so lines fill the canvas width (Scott, 2026-10-01: "the caption full width"). */
export function wrapCaption(text, maxWidth, fontSize) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const cand = line ? line + " " + word : word;
    if (!line || textWidth(cand, fontSize) <= maxWidth) line = cand;
    else {
      lines.push(line);
      line = word;
    }
    while (textWidth(line, fontSize) > maxWidth && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && textWidth(line.slice(0, cut), fontSize) > maxWidth) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param raw   committed SVG source (the inline-page copy)
 * @param opts  { holder, year, url, display?, title?, caption?, creator?, publisher?, date?, license? }
 *   license  { name, url } — printed after the copyright line and carried as cc:license (Scott, 2026-10-02: CC BY-ND 4.0)
 *   url      absolute deep link to the figure on its post (the <a> target)
 *   display  URL text as printed (default: url without the scheme)
 */
export function attributeSvg(raw, opts) {
  const { holder, year, url } = opts;
  if (!holder || !year || !url) throw new Error("attributeSvg: holder, year and url are required");
  const display = opts.display ?? url.replace(/^https?:\/\//, "");
  const c = svgCanvas(raw);
  const fs = footerFontSize(c.w);
  const pad = Math.round(fs * 1.2);
  // The attribution line is ONE unwrapped right-aligned line; on a narrow
  // canvas it would silently clip the license and the deep link — the whole
  // point of the footer. Fail loud (round-2 glmfull F5).
  const attrLine = `© ${year} ${holder}  ·  ${opts.license?.name ? `${opts.license.name}  ·  ` : ""}${display}`;
  if (textWidth(attrLine, fs) > c.w - 2 * pad)
    throw new Error(`attributeSvg: attribution line (${Math.round(textWidth(attrLine, fs))} units) does not fit a ${c.w}-unit canvas — widen the figure or shorten the holder/url`);
  const fsC = captionFontSize(c.w);
  const lineH = Math.round(fsC * 1.35);
  const captionLines = opts.caption ? wrapCaption(opts.caption, c.w - 2 * pad, fsC) : [];
  // Band: top padding + caption block + attribution line + bottom padding.
  const band = Math.round(fs * 2.4) + (captionLines.length ? captionLines.length * lineH + Math.round(fsC * 0.6) : 0);
  const newH = c.h + band;
  if (/\bid="fig-attribution"/.test(raw))
    throw new Error("attributeSvg: source already carries id fig-attribution");

  // 1. Grow the canvas.
  let root = c.root.replace(
    /\bviewBox=["'][^"']*["']/,
    () => `viewBox="${c.x} ${c.y} ${c.w} ${newH}"`,
  );
  if (!/\bviewBox=/.test(root)) root = root.replace(/<svg\b/, `<svg viewBox="0 0 ${c.w} ${newH}"`);
  root = root.replace(/\s(?:width|height)=(["'])[\s\S]*?\1/g, ""); // either quote style (round-2 astra F8)
  // Explicit dimensions (= the viewBox): image consumers read exact intrinsic
  // sizes (the focus view's fit math), and the file opens at natural size.
  root = root.replace(/<svg\b/, () => `<svg width="${c.w}" height="${newH}"`);
  let out = raw.replace(c.root, () => root); // function form: a `$` in an attribute is inert (glmflash r1 F4)

  // 2. Extend the first full-canvas background rect (if any) over the band.
  const rectRe = /<rect\b[^>]*>/g;
  let m;
  let extended = false;
  while ((m = rectRe.exec(out))) {
    const r = m[0];
    const num = (k, d) => {
      const v = r.match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
      return v === undefined ? d : v;
    };
    // The background is the rect at the canvas ORIGIN with the canvas size
    // (numeric equality, deepseek r1 F8 — a stray 0,0 rect on a shifted canvas
    // must not pass).
    const w = String(num("width", ""));
    const h = String(num("height", ""));
    const full =
      Number(num("x", c.x)) === c.x &&
      Number(num("y", c.y)) === c.y &&
      (Number(w) === c.w || w === "100%") &&
      (Number(h) === c.h || h === "100%");
    if (full) {
      const grown = r.replace(/\bheight="[^"]*"/, () => `height="${newH}"`);
      out = out.slice(0, m.index) + grown + out.slice(m.index + r.length);
      extended = true;
      break;
    }
  }

  // 3. Metadata (Dublin Core in the Inkscape/Creative Commons RDF shape) +
  //    <desc>, placed right after the <title> the house law puts first.
  const date = opts.date ?? `${year}`;
  const meta = [
    `<metadata id="fig-attribution-meta">`,
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#">`,
    `<cc:Work rdf:about="">`,
    `<dc:format>image/svg+xml</dc:format>`,
    `<dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>`,
    opts.title ? `<dc:title>${esc(opts.title)}</dc:title>` : "",
    opts.caption ? `<dc:description>${esc(opts.caption)}</dc:description>` : "",
    opts.creator ? `<dc:creator><cc:Agent><dc:title>${esc(opts.creator)}</dc:title></cc:Agent></dc:creator>` : "",
    `<dc:rights><cc:Agent><dc:title>${esc(`© ${year} ${holder}`)}</dc:title></cc:Agent></dc:rights>`,
    opts.publisher ? `<dc:publisher><cc:Agent><dc:title>${esc(opts.publisher)}</dc:title></cc:Agent></dc:publisher>` : "",
    `<dc:source>${esc(url)}</dc:source>`,
    `<dc:date>${esc(date)}</dc:date>`,
    opts.license?.url ? `<cc:license rdf:resource="${esc(opts.license.url)}"/>` : "",
    `</cc:Work>`,
    `</rdf:RDF>`,
    `</metadata>`,
  ]
    .filter(Boolean)
    .join("");
  const desc = opts.caption && !/<desc\b/.test(out) ? `<desc>${esc(opts.caption)}</desc>` : "";
  const titleEnd = out.match(/<title\b[^>]*>[\s\S]*?<\/title>/);
  if (titleEnd) {
    const at = titleEnd.index + titleEnd[0].length;
    out = out.slice(0, at) + desc + meta + out.slice(at);
  } else {
    const at = out.indexOf(root) + root.length;
    out = out.slice(0, at) + desc + meta + out.slice(at);
  }

  // 4. The footer band: hairline, the caption (wrapped, left-aligned, the
  //    house title slate), then one right-aligned attribution line with the
  //    URL as a live link.
  const y = c.y + c.h;
  const baseline = y + band - Math.round(fs * 0.85);
  // Every line but the last is "full": pin it to the measure with textLength
  // (spacing-adjusted) so a fallback font renders the same full-width block.
  const measure = c.w - 2 * pad;
  const captionText = captionLines
    .map((ln, i) => {
      // Pin only a genuinely full line (>= 90 % of the measure): a line the wrap
      // ended early before a long unbreakable token must not be letter-spaced
      // across the width (round-2 fable F7).
      const full = i < captionLines.length - 1 && textWidth(ln, fsC) >= measure * 0.9 ? ` textLength="${measure}" lengthAdjust="spacing"` : "";
      return `<text x="${c.x + pad}" y="${y + pad + Math.round(fsC * 0.9) + i * lineH}" font-size="${fsC}" fill="#334155"${full}>${esc(ln)}</text>`;
    })
    .join("");
  const footer =
    // The band is MEASURED in DejaVu Sans — declare it, or a root without a
    // font-family (two scottclark.io figures) renders the footer in the
    // viewer's default serif with the pinned lines over-stretched (quick
    // review, build seat #1).
    `<g id="fig-attribution" font-family="DejaVu Sans, Verdana, sans-serif" font-size="${fs}" fill="#6b7280">` +
    `<line x1="${c.x}" y1="${y + 0.5}" x2="${c.x + c.w}" y2="${y + 0.5}" stroke="#e5e7eb" stroke-width="1"/>` +
    captionText +
    `<text x="${c.x + c.w - pad}" y="${baseline}" text-anchor="end">` +
    `${esc(`© ${year} ${holder}`)}  ·  ` +
    (opts.license?.name ? `<a href="${esc(opts.license.url)}"><tspan>${esc(opts.license.name)}</tspan></a>  ·  ` : "") +
    `<a href="${esc(url)}"><tspan fill="#4b5563">${esc(display)}</tspan></a>` +
    `</text></g>`;
  const close = out.lastIndexOf("</svg>");
  if (close < 0) throw new Error("attributeSvg: no </svg>");
  out = out.slice(0, close) + footer + "\n" + out.slice(close);
  return { svg: out, width: c.w, height: newH, band, fontSize: fs, captionLines: captionLines.length, backgroundExtended: extended };
}
