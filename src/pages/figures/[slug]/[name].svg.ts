// /figures/<post>/<name>.svg — the DOWNLOADABLE version of a house figure:
// the committed drawing plus the attribution footer and Dublin Core metadata
// (src/lib/figure-attribution.mjs). The inline page copy stays clean; the
// focus view and the download point here. Built for every SVG figure of
// every published post; the AIO gate recomputes each file through the same
// composer and fails on any byte of drift.
import type { APIRoute } from "astro";
import { getFigures, attributedSvg } from "../../../lib/figures";

export async function getStaticPaths() {
  const figs = await getFigures();
  const seen = new Set<string>();
  return figs
    .filter((f) => f.kind === "svg")
    .filter((f) => (seen.has(f.download) ? false : (seen.add(f.download), true)))
    .map((fig) => ({ params: { slug: fig.assetSlug ?? fig.post, name: fig.name }, props: { fig } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { svg } = attributedSvg(props.fig);
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
};
