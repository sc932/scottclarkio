// /figures.json — machine-readable index of every figure the blog renders
// (the ask-a-model reader's view of the figure estate): deep link, caption,
// download (attributed SVG or the raster itself), PNG/page image, source post.
import type { APIRoute } from "astro";
import { siteUrl, figureAttribution } from "../lib/site-content";
import { getFigures, attributionFor } from "../lib/figures";

export const GET: APIRoute = async () => {
  const figs = await getFigures();
  const body = {
    site: siteUrl,
    publisher: figureAttribution.publisher,
    attribution: `Figures are © ${figureAttribution.holder} and the work of ${figureAttribution.creator}; house diagrams download as SVGs carrying an attribution footer and the link to their source ${figureAttribution.sourceNoun}, other images as the original files.`,
    index: `${siteUrl}/figures`,
    reuse: `${siteUrl}/figures#reuse`,
    license: { scope: "house SVG figures only (rasters: all rights reserved)", ...figureAttribution.license },
    count: figs.length,
    figures: figs.map((f) => {
      const a = attributionFor(f);
      return {
        id: f.id,
        url: f.pageUrl,
        post: { slug: f.post, title: f.postTitle, url: f.pageUrl.split("#")[0] },
        kind: f.kind,
        caption: f.caption,
        alt: f.alt,
        image: f.srcUrl,
        download: f.downloadUrl,
        copyright: `© ${a.year} ${a.holder}`,
        license: f.kind === "svg" ? figureAttribution.license.url : null,
        creator: a.creator,
        date: a.date,
      };
    }),
  };
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
