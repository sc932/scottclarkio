// figures.ts — the build-side view of every figure the blog renders: the
// scan (src/lib/figures-scan.mjs, shared with astro.config + the AIO gate)
// joined to the published-post set, plus the attribution composition and the
// JSON-LD ImageObject builder. One source for Figure.astro, the post page,
// the /figures index + twin + manifest, and the derived-SVG endpoint.
import { readFileSync } from "node:fs";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { siteUrl, figureAttribution } from "./site-content";
import { getPublishedPosts, postUrl, type Post } from "./blog";
import { scanBody, figureId } from "./figures-scan.mjs";
import { attributeSvg } from "./figure-attribution.mjs";

export { figureId };

export interface Figure {
  post: string;
  postTitle: string;
  postDate: Date;
  postUpdated?: Date;
  kind: "svg" | "raster";
  name: string;
  id: string;
  caption: string;
  alt: string;
  /** Root-relative page image (PNG twin for SVG figures). */
  src: string;
  svgSource: string | null;
  /** Root-relative download URL (the attributed SVG, or the raster itself). */
  download: string;
  /** Absolute deep link to the figure in its post. */
  pageUrl: string;
  downloadUrl: string;
  srcUrl: string;
}

const svgs = import.meta.glob("/src/assets/blog/**/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function figureSvgRaw(fig: { svgSource: string | null }): string {
  if (!fig.svgSource) throw new Error("figureSvgRaw: raster figure has no SVG source");
  const raw = svgs[`/${fig.svgSource}`];
  if (!raw) throw new Error(`Figure SVG not found: ${fig.svgSource}`);
  return raw;
}

function figuresOf(post: Post): Figure[] {
  // post.body is the MDX body without frontmatter (astro:content).
  return scanBody(post.id, post.body ?? "").map((f) => ({
    ...f,
    postTitle: post.data.title,
    postDate: post.data.date,
    postUpdated: post.data.updated,
    pageUrl: `${postUrl(post)}#${f.id}`,
    downloadUrl: `${siteUrl}${f.download}`,
    srcUrl: `${siteUrl}${f.src}`,
  }));
}

/** Every figure of every published post, listing order (pinned first). */
export async function getFigures(): Promise<Figure[]> {
  const posts = await getPublishedPosts();
  return posts.flatMap(figuresOf);
}

export const getPostFigures = (post: Post) => figuresOf(post);

/** Attribution inputs for one figure — the same values the gate recomputes. */
export function attributionFor(fig: Figure) {
  const svgTitle = fig.svgSource
    ? figureSvgRaw(fig).match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim()
    : undefined;
  return {
    holder: figureAttribution.holder,
    publisher: figureAttribution.publisher,
    creator: figureAttribution.creator,
    year: fig.postDate.getUTCFullYear(),
    date: (fig.postUpdated ?? fig.postDate).toISOString().slice(0, 10),
    url: fig.pageUrl,
    title: svgTitle,
    caption: fig.caption,
  };
}

/** The downloadable SVG: committed drawing + attribution footer + metadata. */
export function attributedSvg(fig: Figure) {
  const r = attributeSvg(figureSvgRaw(fig), attributionFor(fig));
  // House law: every figure carries a full-canvas background rect (the render
  // harness needs it; diagram SKILL rule 33(b)); a transparent footer band is
  // a heuristic miss, never a style (glmfull r1 F3).
  if (!r.backgroundExtended)
    throw new Error(`figure ${fig.svgSource}: no full-canvas background <rect> matched — author one (x/y at the canvas origin, width/height = the viewBox or 100%)`);
  return r;
}

/** Download filename offered by the focus view (`<a download>`). */
export const downloadName = (fig: Figure) =>
  `${fig.post}-${fig.name}${fig.kind === "svg" ? ".svg" : fig.download.slice(fig.download.lastIndexOf("."))}`;

/** schema.org ImageObject for a figure (Google's image-license fields minus a
 * license grant — redistribution terms are Scott's to confirm). */
export function figureImageObject(fig: Figure) {
  const a = attributionFor(fig);
  return {
    "@type": "ImageObject",
    "@id": fig.pageUrl,
    name: fig.caption || fig.alt || fig.name,
    ...(fig.caption && { caption: fig.caption, description: fig.caption }),
    contentUrl: fig.downloadUrl,
    ...(fig.kind === "svg" && { thumbnailUrl: fig.srcUrl, encodingFormat: "image/svg+xml" }),
    url: fig.pageUrl,
    creator: { "@type": "Person", name: a.creator, url: "https://scottclark.io" },
    copyrightNotice: `© ${a.year} ${a.holder}`,
    copyrightYear: a.year,
    creditText: figureAttribution.publisher,
    // The post's BlogPosting node is `<post url>#article` (blog.ts) — a bare
    // URL would dangle (glmflash r1 F3).
    isPartOf: { "@id": `${fig.pageUrl.split("#")[0]}#article` },
  };
}
