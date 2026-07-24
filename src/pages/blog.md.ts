// /blog.md — plain-markdown twin of the writing listing (SiteLayout
// advertises a twin for every page; the AIO gate holds this endpoint to it).
// Rendering lives in lib/blog.ts renderBlogIndexMd so this twin and the
// llms-full corpus never drift (sol S13, 2026-07-23).
import type { APIRoute } from "astro";
import { getPublishedPosts, renderBlogIndexMd } from "../lib/blog";

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  return new Response(renderBlogIndexMd(posts), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
