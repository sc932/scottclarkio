import type { APIRoute } from "astro";
import { renderPressMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderPressMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
