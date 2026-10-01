import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import {
  unified,
  rehypeHeadingIds,
  parseFrontmatter,
} from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { readFileSync, readdirSync } from "node:fs";
import rehypeFigureFocus from "./src/lib/rehype-figure-focus.mjs";
import { scanFigures } from "./src/lib/figures-scan.mjs";

// Per-post <lastmod> for the sitemap, read from blog frontmatter at config
// time (`updated` ?? `date`). Google treats lastmod as all-or-nothing trust:
// bump `updated` only on real content changes; pages without a truthful date
// simply omit lastmod (omit, never fake).
const postLastmod = new Map();
// Anchored to THIS file, not process CWD — `astro build --root` from another
// directory must not silently drop every lastmod (sol S15, 2026-07-23).
const BLOG_DIR = new URL("./src/content/blog/", import.meta.url);
try {
  for (const f of readdirSync(BLOG_DIR)) {
    if (!f.endsWith(".mdx")) continue;
    const { frontmatter } = parseFrontmatter(
      readFileSync(new URL(f, BLOG_DIR), "utf8"),
    );
    if (frontmatter.draft === true) continue;
    const d = frontmatter.updated ?? frontmatter.date;
    const dObj = d ? new Date(d) : null;
    if (dObj && !Number.isNaN(dObj.getTime())) {
      postLastmod.set(`/blog/${f.replace(/\.mdx$/, "")}`, dObj.toISOString());
    }
  }
} catch (err) {
  // ENOENT = no posts yet (fine); anything else must fail the build — a
  // swallowed parse error here would silently drop every lastmod (sol S15).
  if (err?.code !== "ENOENT") throw err;
}

// Figure images ride the sitemap as <image:image> entries on their post (the
// image-sitemap extension, <image:loc> only — see the press note above): the
// attributed SVG for house figures, the raster itself otherwise. Same scan as
// the build (src/lib/figures-scan.mjs), so the sitemap cannot list a figure
// the page does not render.
const figureImages = new Map();
for (const fig of scanFigures({
  blogDir: new URL("./src/content/blog/", import.meta.url).pathname,
  parseFrontmatter,
})) {
  const path = `/blog/${fig.post}`;
  if (!figureImages.has(path)) figureImages.set(path, []);
  figureImages.get(path).push({ url: `https://scottclark.io${fig.download}` });
  // House figures: the PNG twin rides too — what social/og surfaces reference
  // and what Google Images indexes most reliably (glmfull r1 rec b).
  if (fig.kind === "svg") figureImages.get(path).push({ url: `https://scottclark.io${fig.src}` });
}

export default defineConfig({
  site: "https://scottclark.io",
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, "") || "/";
        const lastmod = postLastmod.get(path);
        if (lastmod) item.lastmod = lastmod;
        if (figureImages.has(path)) item.img = figureImages.get(path);
        return item;
      },
    }),
  ],
  redirects: {
    "/about": "/",
  },
  markdown: {
    // Astro 7's default markdown pipeline (Sätteri) does not run remark/rehype
    // plugins — pin the classic unified pipeline (MDX inherits it). smartypants
    // OFF is a house rule: plain-ASCII output, never smart-quote the prose.
    // Heading ids + wrapped self-links give every section a stable anchor (an
    // AIO citation asset). Light shiki theme matches the light-only site.
    processor: unified({
      smartypants: false,
      shikiConfig: { theme: "github-light" },
      rehypePlugins: [
        rehypeHeadingIds,
        [rehypeAutolinkHeadings, { behavior: "wrap" }],
        // Markdown images -> focusable, deep-linkable figures (figure focus,
        // 2026-10-01; same markup contract as Figure.astro).
        rehypeFigureFocus,
        [rehypeExternalLinks, { rel: ["noopener", "noreferrer"] }],
      ],
    }),
  },
});
