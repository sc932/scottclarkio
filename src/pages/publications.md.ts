import type { APIRoute } from "astro";
import { renderPublicationsMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderPublicationsMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
