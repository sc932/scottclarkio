// Blog helpers shared by the listing, post pages, .md twins, the RSS feed,
// and the llms endpoints — one source for sorting, URLs, JSON-LD, and the
// plain-markdown rendering so the surfaces never drift. scottclarkio
// instantiation of the estate blog grammar (vault: blog-grammar.md); the
// JSON-LD seam here references the site's canonical Person/#website nodes.
import { getCollection, type CollectionEntry } from "astro:content";
import { siteUrl } from "./site-content";

export type Post = CollectionEntry<"blog">;

/** Non-draft posts: pinned first, then newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.date.valueOf() - a.data.date.valueOf();
  });
}

export const postPath = (post: Post) => `/blog/${post.id}`;
export const postUrl = (post: Post) => `${siteUrl}${postPath(post)}`;
export const postOgImage = (post: Post) => `${postUrl(post)}/og.png`;

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Human label for a pillar slug ("startup-leadership" -> "Startup Leadership"). */
export function pillarLabel(pillar: string): string {
  return pillar
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// BlogPosting (+ VideoObject when format: video) JSON-LD node for a post page.
// Author + publisher reference the site's canonical Person node — this Person
// is the estate's ONE author identity; the company blogs point here too.
export function buildBlogPostingSchema(post: Post) {
  const person = { "@id": `${siteUrl}/#person` };
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${postUrl(post)}#article`,
    headline: post.data.title,
    description: post.data.description,
    url: postUrl(post),
    mainEntityOfPage: postUrl(post),
    datePublished: post.data.date.toISOString(),
    ...(post.data.updated
      ? { dateModified: post.data.updated.toISOString() }
      : {}),
    author:
      post.data.author === "Scott Clark"
        ? person
        : { "@type": "Person", name: post.data.author },
    publisher: person,
    image: postOgImage(post),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    ...(post.data.pillar
      ? { articleSection: pillarLabel(post.data.pillar) }
      : {}),
  };
  if (post.data.format === "video" && post.data.videoId) {
    node.video = {
      "@type": "VideoObject",
      name: post.data.title,
      description: post.data.description,
      thumbnailUrl: `https://i.ytimg.com/vi/${post.data.videoId}/maxresdefault.jpg`,
      uploadDate: (post.data.videoUploadDate ?? post.data.date).toISOString(),
      embedUrl: `https://www.youtube-nocookie.com/embed/${post.data.videoId}`,
      ...(post.data.videoDuration
        ? { duration: post.data.videoDuration }
        : {}),
    };
  }
  return node;
}

/** Blog (CollectionPage) node for the /blog listing. */
export function buildBlogIndexSchema(posts: Post[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/blog#blog`,
    url: `${siteUrl}/blog`,
    name: "Writing by Scott Clark",
    inLanguage: "en-US",
    author: { "@id": `${siteUrl}/#person` },
    publisher: { "@id": `${siteUrl}/#person` },
    isPartOf: { "@id": `${siteUrl}/#website` },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      "@id": `${postUrl(p)}#article`,
      headline: p.data.title,
      url: postUrl(p),
      datePublished: p.data.date.toISOString(),
    })),
  };
}

// ---- plain-markdown rendering (the .md twins + llms-full + feed fallbacks) ----

// MDX bodies are written against a CONTROLLED component grammar: single-line,
// self-closing <Figure .../> and <YouTubeFacade .../> only (blog-grammar.md).
export function mdxBodyToPlainMd(post: Post): string {
  let body = post.body ?? "";
  body = body.replace(/^import .*$\n?/gm, "");
  body = body.replace(/^\{\/\*[\s\S]*?\*\/\}\n?/m, "");
  body = body.replace(
    /<Figure\s+slug="([^"]+)"\s+name="([^"]+)"\s+caption="([^"]*)"[^/>]*\/>/g,
    (_m, slug, name, caption) =>
      `![${caption}](${siteUrl}/images/blog/${slug}/${name}.png)`,
  );
  body = body.replace(
    /<YouTubeFacade\s+id="([^"]+)"\s+title="([^"]*)"[^/>]*\/>/g,
    (_m, id, title) =>
      `[Watch on YouTube: ${title}](https://www.youtube.com/watch?v=${id})`,
  );
  return body.trim();
}

/** Full markdown twin for a post (served at /blog/<slug>.md). */
export function renderPostMd(post: Post): string {
  const meta = [
    `Author: ${post.data.author}`,
    `Published: ${post.data.date.toISOString().slice(0, 10)}`,
    ...(post.data.updated
      ? [`Updated: ${post.data.updated.toISOString().slice(0, 10)}`]
      : []),
    ...(post.data.pillar ? [`Pillar: ${pillarLabel(post.data.pillar)}`] : []),
    `Canonical: ${postUrl(post)}`,
  ].join("  \n");
  return `# ${post.data.title}

> ${post.data.description}

${meta}

---

${mdxBodyToPlainMd(post)}

---

Source: ${postUrl(post)} (Scott Clark)
`;
}
