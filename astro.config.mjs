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

export default defineConfig({
  site: "https://scottclark.io",
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, "") || "/";
        const lastmod = postLastmod.get(path);
        if (lastmod) item.lastmod = lastmod;
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
        [rehypeExternalLinks, { rel: ["noopener", "noreferrer"] }],
      ],
    }),
  },
});
