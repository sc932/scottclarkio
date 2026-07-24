// /rss.xml — FULL-CONTENT feed of the blog (Phase 2 reactivation, 2026-07).
// Full bodies ship via the `content` key: agents and readers consume feeds
// directly, and full-content is the 2026 recommendation. MDX renders through
// the Container API; figure SVGs are swapped for their PNG twins and
// root-relative URLs absolutized for feed context.
import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer as getMDXRenderer } from "@astrojs/mdx/container-renderer";
import { render } from "astro:content";
import { siteUrl, blogDescription } from "../lib/site-content";
import { getPostsByDate, postPath, pillarLabel } from "../lib/blog";

function feedifyHtml(html: string): string {
  return html
    .replace(
      /<figure class="post-figure" data-png="([^"]+)">[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/g,
      (_m, png, caption) => {
        const alt = String(caption).replace(/<[^>]+>/g, "");
        return `<figure><img src="${siteUrl}${png}" alt="${alt}" /><figcaption>${caption}</figcaption></figure>`;
      },
    )
    .replace(/(href|src)="\/(?!\/)/g, `$1="${siteUrl}/`); // (?!\/) guards protocol-relative URLs (round-2 S13)
}

export const GET: APIRoute = async (context) => {
  // Strict date order — pinning is a listing affordance, never feed order
  // (sol S12, 2026-07-23).
  const posts = await getPostsByDate();
  const renderers = await loadRenderers([getMDXRenderer()]);
  const container = await AstroContainer.create({ renderers });

  const items = [];
  for (const post of posts) {
    const { Content } = await render(post);
    const html = await container.renderToString(Content);
    items.push({
      title: post.data.title,
      link: postPath(post),
      pubDate: post.data.date,
      description: post.data.description,
      content: feedifyHtml(html),
      categories: [
        post.data.pillar ? pillarLabel(post.data.pillar) : undefined,
        post.data.kind,
      ].filter((c): c is string => Boolean(c)),
    });
  }

  return rss({
    // Channel identity: the WRITING feed's own name (matches the JSON-LD
    // Blog node), not the bare site name (sol S12, 2026-07-23) — feed
    // readers list this next to every other subscription.
    title: "Writing by Scott Clark",
    description: blogDescription,
    site: context.site?.toString() ?? siteUrl,
    items,
    trailingSlash: false,
    customData: "<language>en-us</language>",
  });
};
