// IndexNow ping — runs in the deploy workflow AFTER the S3 sync +
// invalidation, so Bing-fed surfaces (Bing, DuckDuckGo, others) learn about
// changed URLs immediately. Google ignores IndexNow; that's fine — this is
// the Bing lane (SPEC-blog-surfaces, AIO layer).
//
// Zero config: the key is the public `public/<32-hex>.txt` file (IndexNow
// verifies ownership by fetching it — it is not a secret), and the URL list
// is read from the built sitemap. The whole site is submitted each deploy:
// it is ~40 URLs against a 10k-per-call protocol limit, and re-submission
// is explicitly allowed. Failures WARN but never fail the deploy — search
// pings are best-effort, the site itself is already live.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const PUB = "public";

const keyFile = readdirSync(PUB).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("indexnow: no public/<32-hex>.txt key file — skipping");
  process.exit(0);
}
const key = keyFile.replace(/\.txt$/, "");

// sitemap-index.xml -> sitemap-*.xml -> <loc> URLs.
const index = readFileSync(join(DIST, "sitemap-index.xml"), "utf8");
const parts = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const urls = new Set();
for (const part of parts) {
  const file = part.split("/").pop();
  const xml = readFileSync(join(DIST, file), "utf8");
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
}
if (urls.size === 0) {
  console.error("indexnow: sitemap yielded zero URLs — skipping");
  process.exit(0);
}
const host = new URL([...urls][0]).host;

const body = {
  host,
  key,
  keyLocation: `https://${host}/${keyFile}`,
  urlList: [...urls],
};

try {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 = ok, 202 = accepted (key validation pending) — both are success.
  console.log(`indexnow: submitted ${urls.size} URLs for ${host} -> HTTP ${res.status}`);
  if (res.status >= 400)
    console.error(`indexnow: WARN non-success status ${res.status} (deploy unaffected)`);
} catch (err) {
  console.error(`indexnow: WARN ping failed (deploy unaffected): ${err.message}`);
}
