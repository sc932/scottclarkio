// /llms-full.txt — full site corpus for one-shot LLM ingestion.
// Concatenates the markdown from every page on the site.

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

export const GET: APIRoute = async () => {
  const sections = await Promise.all([
    renderHomeMd(),
    renderCvMd(),
    renderTalksMd(),
    renderProjectsMd(),
    renderPublicationsMd(),
    renderPressMd(),
  ]);
  const txt = `# Scott Clark — Full Site Corpus

This file concatenates every page on ${siteUrl} as plain markdown for one-shot LLM ingestion. Built automatically at deploy time. Per-page sources are at ${siteUrl}/index.md, /cv.md, /talks.md, /projects.md, /publications.md, /press.md.

================================================================
${sections.join("\n\n================================================================\n\n")}
`;
  return new Response(txt, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
