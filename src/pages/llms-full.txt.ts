// /llms-full.txt — full site corpus for one-shot LLM ingestion.
// Concatenates the markdown from every page on the site, including the
// writing listing and every published post — each rendered by the same
// functions that serve the .md twins, so the surfaces never drift.

import type { APIRoute } from "astro";
import { siteUrl } from "../lib/site-content";
import {
  renderHomeMd,
  renderCvMd,
  renderTalksMd,
  renderProjectsMd,
  renderPublicationsMd,
  renderPressMd,
} from "../lib/md-pages";
import {
  getPublishedPosts,
  getPostsByDate,
  renderBlogIndexMd,
  renderPostMd,
} from "../lib/blog";

export const GET: APIRoute = async () => {
  // Listing mirrors the HTML index (pinned-first); post bodies ride in strict
  // date order — a corpus is an archive, not a landing page (sol S12/S13).
  const listing = renderBlogIndexMd(await getPublishedPosts());
  const posts = await getPostsByDate();
  const sections = await Promise.all([
    renderHomeMd(),
    renderCvMd(),
    renderTalksMd(),
    renderProjectsMd(),
    renderPublicationsMd(),
    renderPressMd(),
    ...(posts.length ? [Promise.resolve(listing)] : []),
    ...posts.map((p) => Promise.resolve(renderPostMd(p))),
  ]);
  const txt = `# Scott Clark — Full Site Corpus

This file concatenates every page on ${siteUrl} as plain markdown for one-shot LLM ingestion. Built automatically at deploy time. Per-page sources are at ${siteUrl}/index.md, /cv.md, /talks.md, /projects.md, /publications.md, /press.md, /blog.md, and \`/blog/<slug>.md\`.

================================================================
${sections.join("\n\n================================================================\n\n")}
`;
  return new Response(txt, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
