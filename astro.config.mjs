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
try {
  for (const f of readdirSync("./src/content/blog")) {
    if (!f.endsWith(".mdx")) continue;
    const { frontmatter } = parseFrontmatter(
      readFileSync(`./src/content/blog/${f}`, "utf8"),
    );
    if (frontmatter.draft === true) continue;
    const d = frontmatter.updated ?? frontmatter.date;
    if (d) {
      postLastmod.set(
        `/blog/${f.replace(/\.mdx$/, "")}`,
        new Date(d).toISOString(),
      );
    }
  }
} catch {
  // no posts yet — sitemap simply omits lastmod
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
