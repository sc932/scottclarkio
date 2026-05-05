import type { APIRoute } from "astro";
import { renderTalksMd } from "../lib/md-pages";

export const GET: APIRoute = async () => {
  return new Response(await renderTalksMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
