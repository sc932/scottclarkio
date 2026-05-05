import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://scottclark.io",
  integrations: [sitemap()],
  redirects: {
    "/about": "/",
  },
});
