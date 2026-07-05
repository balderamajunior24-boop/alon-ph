import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import tailwind from "@astrojs/tailwind";

// Load .env (all keys, no prefix filter) into process.env so src/lib/catalog.js
// can read SHEET_API_KEY etc. at build time. In CI these come from real env vars
// (GitHub secrets), which loadEnv also picks up.
const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [k, v] of Object.entries(env)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

// Static site. Catalog is fetched from Google Sheets at BUILD time,
// so the API key stays server-side and never ships to the browser.
//
// SITE_URL / BASE_PATH let GitHub Pages set the right URLs without editing code:
//   - Project site  (https://<user>.github.io/alon-ph-v2/): SITE_URL=https://<user>.github.io, BASE_PATH=/alon-ph-v2
//   - User site     (https://<user>.github.io/):            SITE_URL=https://<user>.github.io, BASE_PATH=/
//   - Custom domain (https://alonph.com/):                  SITE_URL=https://alonph.com,        BASE_PATH=/
const site = process.env.SITE_URL || undefined;
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  output: "static",
  integrations: [tailwind({ applyBaseStyles: false })],
});
