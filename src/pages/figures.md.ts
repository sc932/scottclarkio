import type { APIRoute } from "astro";
import { renderFiguresMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderFiguresMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
