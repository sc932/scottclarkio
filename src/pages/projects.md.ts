import type { APIRoute } from "astro";
import { renderProjectsMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderProjectsMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
