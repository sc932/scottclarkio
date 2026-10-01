// figures-scan.mjs — ONE enumeration of every figure the blog renders, shared
// by the build (src/lib/figures.ts, the /figures endpoints), the config
// (astro.config.mjs: sitemap <image:image> entries) and the AIO gate
// (scripts/aio-check.mjs). Plain Node ESM so all three can import it.
//
// The MDX bodies follow the controlled component grammar (blog-grammar.md):
// `<Figure slug="…" name="…" caption="…" />` single-line + self-closing, and
// plain markdown images `![alt](/images/blog/<slug>/<file>)`. Both become a
// focusable figure on the page (Figure.astro / rehype-figure-focus.mjs) with a
// stable deep-link id; this module is where the id law and the derived-asset
// URLs live so the page, the twins, the manifest and the gate cannot drift.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";

/** Deep-link id for a figure asset name: `fig-` + the name with any leading
 * `figN-` authoring prefix dropped (fig1-architecture -> fig-architecture;
 * why-im-building-talaria -> fig-why-im-building-talaria). Lowercase, [a-z0-9-]. */
export function figureId(name) {
  const base = String(name)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^fig\d+-/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!base) throw new Error(`figureId: empty id from name "${name}"`);
  return `fig-${base}`;
}

// Astro decodes an MDX attribute once when it renders the page; the machine
// surfaces (manifest, JSON-LD, <desc>) must carry the same text (glmflash r1 F6).
export const decodeEntities = (s) =>
  s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_m, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" })[e]);
const attr = (attrs, k) => {
  const v = attrs.match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
  return v === undefined ? undefined : decodeEntities(v);
};

/** Strip fenced code + inline code so sample markup never counts as a figure
 * (the same masking the twin renderer uses). */
function maskCode(body) {
  return body
    .replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g, "$1")
    // Code spans of ANY backtick run length (`x`, `` `x` ``, ``` `` ```): a
    // double-backtick span containing single backticks must mask as one span,
    // or the mask swallows prose between spans — and an image with it (the
    // distributional archive hit this, round-1 fold).
    .replace(/(`+)(?!`)[^\n]*?[^`\n]\1(?!`)/g, "");
}

/** Figures of ONE post body, in document order. */
export function scanBody(slug, body) {
  const out = [];
  const src = maskCode(body);
  // The <Figure> attribute body may contain ">" inside a quoted value (fable r1 F13).
  const re = /<Figure\s+((?:[^>"]|"[^"]*")*?)\/>|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] !== undefined) {
      const name = attr(m[1], "name");
      const figSlug = attr(m[1], "slug") ?? slug;
      const caption = attr(m[1], "caption") ?? "";
      if (!name) continue;
      out.push({
        post: slug,
        assetSlug: figSlug,
        kind: "svg",
        name,
        id: figureId(name),
        caption,
        alt: attr(m[1], "alt") ?? caption,
        // The inline page copy renders the committed SVG; the PNG twin feeds
        // twins/feeds/social; the attributed SVG is the download.
        src: `/images/blog/${figSlug}/${name}.png`,
        svgSource: `src/assets/blog/${figSlug}/${name}.svg`,
        download: `/figures/${figSlug}/${name}.svg`,
      });
    } else {
      const url = m[3];
      // Root-relative site images only; external images are not ours to index.
      if (!url.startsWith("/") || url.startsWith("//")) continue;
      const file = basename(url);
      const name = file.slice(0, file.length - extname(file).length);
      // The caption rehype adopts: the next non-blank line, italic-only, on its
      // own, <= 400 chars (grok r1 F8 — the machine surfaces must agree with
      // the page).
      const after = src.slice(m.index + m[0].length);
      const nxt = after.match(/^[ \t]*\n\s*\n([^\n]+)\n(?:\s*\n|$)/);
      const ital = nxt?.[1]?.trim().match(/^(\*|_)(?!\1)(.+)\1$/);
      const caption = ital && ital[2].length <= 400 ? ital[2] : "";
      out.push({
        post: slug,
        kind: "raster",
        name,
        id: figureId(file), // the FULL filename — the same input rehype uses (astra r1 F6)
        caption,
        alt: decodeEntities(m[2] ?? ""),
        src: url,
        svgSource: null,
        download: url,
      });
    }
  }
  const seen = new Set();
  out.forEach((f, i) => {
    if (seen.has(f.id))
      throw new Error(`figures: duplicate deep-link id "${f.id}" in post ${slug} (rename one asset)`);
    seen.add(f.id);
    f.ordinal = i + 1; // 1-based position among the post's figures (label fallback for alt-less images)
  });
  return out;
}

/** Every figure of every non-draft post under blogDir (flat *.mdx by contract).
 * `parseFrontmatter` is injected so this module needs no Astro import. */
export function scanFigures({ blogDir, parseFrontmatter }) {
  const figures = [];
  if (!existsSync(blogDir)) return figures;
  for (const f of readdirSync(blogDir).filter((n) => n.endsWith(".mdx")).sort()) {
    const raw = readFileSync(join(blogDir, f), "utf8");
    const { frontmatter, content } = parseFrontmatter(raw);
    // "Published" = not draft — the same predicate as blog.ts getPublishedPosts;
    // a divergence fails the manifest/index lockstep teeth in the gate loudly.
    if (frontmatter.draft === true) continue;
    const slug = f.replace(/\.mdx$/, "");
    for (const fig of scanBody(slug, content)) {
      figures.push({
        ...fig,
        postTitle: frontmatter.title,
        postDate: frontmatter.date,
        postUpdated: frontmatter.updated,
      });
    }
  }
  return figures;
}
