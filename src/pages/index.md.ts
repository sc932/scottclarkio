import type { APIRoute } from "astro";
import { renderHomeMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderHomeMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
