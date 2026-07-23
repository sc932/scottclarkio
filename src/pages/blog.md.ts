// /blog.md — plain-markdown twin of the writing listing (SiteLayout
// advertises a twin for every page; the AIO gate holds this endpoint to it).
import type { APIRoute } from "astro";
import { siteUrl, blogTitle, blogDescription } from "../lib/site-content";
import { getPublishedPosts, postUrl, formatDate } from "../lib/blog";

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const rows = posts
    .map(
      (p) =>
        `- [${p.data.title}](${postUrl(p)}.md) (${formatDate(p.data.date)}): ${p.data.description}`,
    )
    .join("\n");
  const txt = `# ${blogTitle} — Scott Clark

> ${blogDescription}

Each entry links the post's plain-markdown twin; HTML versions live at ${siteUrl}/blog/<slug>. Full-content RSS: ${siteUrl}/rss.xml.

${rows}

---

Source: ${siteUrl}/blog (Scott Clark)
`;
  return new Response(txt, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
