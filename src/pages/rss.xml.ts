// /rss.xml — RSS feed shell. Currently empty (no items). Will fill when the
// blog reactivates in Phase 2 (gated on content_speedrun queueing >=6 posts).

import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { pageDescription, siteUrl } from "../lib/site-content";

export const GET: APIRoute = async (context) => {
  return rss({
    title: "Scott Clark",
    description: pageDescription,
    site: context.site?.toString() ?? siteUrl,
    items: [],
  });
};
