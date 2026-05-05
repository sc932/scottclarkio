import type { APIRoute } from "astro";
import { renderCvMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderCvMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
