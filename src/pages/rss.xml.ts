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
      /<figure class="post-figure"[^>]*data-png="([^"]+)"[^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>\s*<\/figure>/g,
      (_m, png, caption) => {
        const cap = String(caption)
          .replace(/<a\s[^>]*class="[^"]*\bfig-anchor\b[^"]*"[^>]*>[\s\S]*?<\/a>\s*/g, "")
          .trim();
        const alt = cap.replace(/<[^>]+>/g, "");
        return `<figure><img src="${siteUrl}${png}" alt="${alt}" /><figcaption>${cap}</figcaption></figure>`;
      },
    )
    // Markdown-image figures (rehype-figure-focus): unwrap to a plain figure.
    .replace(/<a\s[^>]*class="[^"]*\bfig-open\b[^"]*"[^>]*>([\s\S]*?)<span\s[^>]*class="[^"]*\bfig-expand\b[^"]*"[^>]*>\s*<\/span>\s*<\/a>/g, "$1")
    .replace(/<a\s[^>]*class="[^"]*\bfig-anchor\b[^"]*"[^>]*>[\s\S]*?<\/a>\s*/g, "")
    // YouTubeFacade -> feed-safe anchor-wrapped poster (the sol S10 tooth:
    // no yt-facade/button/iframe/script markup may reach the feed). Astro's
    // scoped-style pass injects data-astro-cid-* into the tag, so match the
    // div loosely and parse the data attributes out of the matched block;
    // the facade nests no <div>, so non-greedy to the first </div> is exact.
    .replace(
      /<div[^>]*class="yt-facade[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      (m) => {
        const embed = m.match(/data-embed="([^"]*)"/)?.[1] ?? "";
        const title = m.match(/data-title="([^"]*)"/)?.[1] ?? "YouTube video";
        const id = embed.match(/\/embed\/([A-Za-z0-9_-]{11})/)?.[1] ?? "";
        const watch = `https://www.youtube.com/watch?v=${id}`;
        const poster = m.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? "";
        const posterAbs =
          poster && !poster.startsWith("http") ? `${siteUrl}${poster}` : poster;
        const img = posterAbs
          ? `<a href="${watch}"><img src="${posterAbs}" alt="Watch on YouTube: ${title}" /></a>`
          : "";
        return `<figure>${img}<figcaption><a href="${watch}">Watch on YouTube: ${title}</a></figcaption></figure>`;
      },
    )
    // Defense in depth: no <script> of any kind ships in a feed, whether or
    // not the Container render inlined the facade's loader.
    .replace(/<script[\s\S]*?<\/script>/g, "")
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
