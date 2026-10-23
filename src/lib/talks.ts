// Talk → recap-post resolution (2026-10-23). A talks-collection entry names
// its recap by blog slug (`recap: <slug>`); the /talks page, its JSON-LD, and
// the .md twin all render the POST's own title as the link text, so the
// title can never drift from the post and a slug is never shown as prose
// (the cross-link gate's bare-path rule fails that). A slug that is not a
// published post fails the BUILD here, never ships as a dead link.
import { getCollection, type CollectionEntry } from "astro:content";
import type { Post } from "./blog";

export type Talk = CollectionEntry<"talks">;

/** talk id → its published recap post, for every talk that declares one. */
export async function recapPosts(talks: Talk[]): Promise<Map<string, Post>> {
  const posts = new Map(
    (await getCollection("blog", ({ data }) => !data.draft)).map((p) => [p.id, p]),
  );
  const out = new Map<string, Post>();
  for (const t of talks) {
    const slug = t.data.recap;
    if (!slug) continue;
    const post = posts.get(slug);
    if (!post)
      throw new Error(
        `src/content/talks/${t.id}.yaml: recap "${slug}" is not a published blog post (expected src/content/blog/${slug}.mdx, non-draft)`,
      );
    out.set(t.id, post);
  }
  return out;
}
