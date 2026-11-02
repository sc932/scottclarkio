// /figures/<post>/<name>.png — the PNG twin of the DOWNLOADABLE attributed
// SVG (src/pages/figures/[slug]/[name].svg.ts): the same drawing + footer
// band (caption, copyright, license, deep link) rasterized at 2x by
// src/lib/figure-png.mjs with the vendored fonts (Scott, 2026-11-02: "offer
// both svg and png formats. Many sites prefer png."). Built for every SVG
// figure of every published post; the AIO gate recomputes each file through
// the same renderer and fails on any byte of drift.
import type { APIRoute } from "astro";
import { getFigures, attributedPng } from "../../../lib/figures";

export async function getStaticPaths() {
  const figs = await getFigures();
  const seen = new Set<string>();
  return figs
    .filter((f) => f.kind === "svg" && f.downloadPng)
    .filter((f) => (seen.has(f.downloadPng!) ? false : (seen.add(f.downloadPng!), true)))
    .map((fig) => ({ params: { slug: fig.assetSlug ?? fig.post, name: fig.name }, props: { fig } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { png } = attributedPng(props.fig);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
