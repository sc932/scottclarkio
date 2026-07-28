// Per-post Open Graph card (1200x630) rendered at build time: satori (layout)
// -> resvg (raster). Fonts are vendored static-instance woffs (satori cannot
// read the site's variable woff2s) — see src/assets/og/fonts/README.md.
import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getPublishedPosts,
  formatDate,
  pillarLabel,
  titleParts,
  type Post,
} from "../../../lib/blog";

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

// Resolved from the project root: the endpoint gets bundled before prerender,
// so import.meta.url-relative paths would point into dist/.prerender chunks.
const serif = readFileSync(
  resolve("src/assets/og/fonts/source-serif-4-latin-600-normal.woff"),
);
const sans = readFileSync(
  resolve("src/assets/og/fonts/ibm-plex-sans-latin-400-normal.woff"),
);

type El = { type: string; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: El[] | string,
): El => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Post };
  const title = post.data.title;
  // Scale the title down as it grows so the wrapped lines always fit the
  // 630px canvas; the schema caps titles at 110 chars (sol S23, 2026-07-23).
  const titleSize =
    title.length > 90 ? 46 : title.length > 70 ? 54 : title.length > 45 ? 62 : 68;

  const tree = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#fbf9f4",
      padding: "72px 80px",
      fontFamily: "IBM Plex Sans",
    },
    [
      el(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
        [
          el(
            "div",
            {
              fontSize: 26,
              letterSpacing: 5,
              color: "#6c655d",
              textTransform: "uppercase",
            },
            "Scott Clark",
          ),
          ...(post.data.pillar
            ? [
                el(
                  "div",
                  {
                    fontSize: 21,
                    letterSpacing: 3,
                    color: "#8a847a",
                    textTransform: "uppercase",
                  },
                  pillarLabel(post.data.pillar),
                ),
              ]
            : []),
        ],
      ),
      el("div", {
        width: 64,
        height: 4,
        backgroundColor: "#8a3f1f",
        marginTop: 44,
        marginBottom: 40,
      }),
      // Colon titles break after the colon, never mid-phrase (Scott,
      // 2026-07-24): each segment renders as its own row; a segment longer
      // than the canvas still wraps internally within its row.
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          fontFamily: "Source Serif 4",
          fontSize: titleSize,
          fontWeight: 600,
          lineHeight: 1.14,
          color: "#1c1916",
          letterSpacing: "-0.01em",
          maxWidth: 1000,
        },
        titleParts(title).map((part) => el("div", { display: "flex" }, part)),
      ),
      el("div", { display: "flex", flexGrow: 1 }),
      el(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: "#6c655d",
        },
        [
          el("div", {}, "scottclark.io"),
          el("div", { color: "#8a847a" }, formatDate(post.data.date)),
        ],
      ),
    ],
  );

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Source Serif 4", data: serif, weight: 600, style: "normal" },
      { name: "IBM Plex Sans", data: sans, weight: 400, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
    .render()
    .asPng();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
