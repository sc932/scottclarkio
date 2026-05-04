import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://scottclark.io",
  integrations: [],
  redirects: {
    "/about": "/",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
