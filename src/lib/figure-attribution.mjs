// figure-attribution.mjs — compose the DOWNLOADABLE version of a house SVG
// figure: the committed drawing plus an attribution footer (copyright line +
// the figure's deep-link URL, bottom-right) and machine-readable Dublin Core
// metadata. The inline page copy stays clean; the focus view and the
// download serve this derivative (built by src/pages/figures/[slug]/[name].svg.ts,
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
  const w = root[0].match(/\bwidth="([\d.]+)"/)?.[1];
  const h = root[0].match(/\bheight="([\d.]+)"/)?.[1];
  if (!w || !h) throw new Error("attributeSvg: root has neither viewBox nor width/height");
  return { root: root[0], x: 0, y: 0, w: +w, h: +h };
}

/** Footer type size in user units: ~1% of the canvas width, clamped so the
 * line stays legible on narrow figures and quiet on wide ones. */
export const footerFontSize = (w) => Math.min(18, Math.max(11, Math.round(w / 95)));

/**
 * @param raw   committed SVG source (the inline-page copy)
 * @param opts  { holder, year, url, display?, title?, caption?, creator?, publisher?, date? }
 *   url      absolute deep link to the figure on its post (the <a> target)
 *   display  URL text as printed (default: url without the scheme)
 */
export function attributeSvg(raw, opts) {
  const { holder, year, url } = opts;
  if (!holder || !year || !url) throw new Error("attributeSvg: holder, year and url are required");
  const display = opts.display ?? url.replace(/^https?:\/\//, "");
  const c = svgCanvas(raw);
  const fs = footerFontSize(c.w);
  const band = Math.round(fs * 2.4);
  const pad = Math.round(fs * 1.2);
  const newH = c.h + band;
  if (/\bid="fig-attribution"/.test(raw))
    throw new Error("attributeSvg: source already carries id fig-attribution");

  // 1. Grow the canvas.
  let root = c.root.replace(
    /\bviewBox=["'][^"']*["']/,
    () => `viewBox="${c.x} ${c.y} ${c.w} ${newH}"`,
  );
  if (!/\bviewBox=/.test(root)) root = root.replace(/<svg\b/, `<svg viewBox="0 0 ${c.w} ${newH}"`);
  root = root.replace(/\s(?:width|height)="[^"]*"/g, "");
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

  // 4. The footer band: hairline + one right-aligned line, URL as a live link.
  const y = c.y + c.h;
  const baseline = y + band - Math.round(fs * 0.85);
  const footer =
    `<g id="fig-attribution" font-size="${fs}" fill="#6b7280">` +
    `<line x1="${c.x}" y1="${y + 0.5}" x2="${c.x + c.w}" y2="${y + 0.5}" stroke="#e5e7eb" stroke-width="1"/>` +
    `<text x="${c.x + c.w - pad}" y="${baseline}" text-anchor="end">` +
    `${esc(`© ${year} ${holder}`)}  ·  ` +
    `<a href="${esc(url)}"><tspan fill="#4b5563">${esc(display)}</tspan></a>` +
    `</text></g>`;
  const close = out.lastIndexOf("</svg>");
  if (close < 0) throw new Error("attributeSvg: no </svg>");
  out = out.slice(0, close) + footer + "\n" + out.slice(close);
  return { svg: out, width: c.w, height: newH, band, fontSize: fs, backgroundExtended: extended };
}
