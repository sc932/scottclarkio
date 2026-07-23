// Per-post plain-markdown twin at /blog/<slug>.md — the AIO surface agents
// actually consume. Rendering lives in lib/blog.ts (renderPostMd) so this
// endpoint, llms-full, and the feed never drift.
import type { APIRoute } from "astro";
import { getPublishedPosts, renderPostMd, type Post } from "../../lib/blog";

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Post };
  return new Response(renderPostMd(post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
