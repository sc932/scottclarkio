#!/usr/bin/env node
// AIO regression gate v2 — asserts the estate's SEO/AIO invariants over dist/
// so "we never lose an AIO trick" is CHECKED, not remembered. Runs in CI
// between build and deploy (deploy.yml) and locally via `npm run check:aio`.
// Estate contract: vault Projects/content_factory/blog-grammar.md § gate.
// v2 additions come from the 2026-07-23 cross-model referee round.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// ---- per-repo config ----
const SITE_URL = "https://scottclark.io";
// "all" = whole file; "blog-body" = blog pages only, <head> stripped (for
// sites whose pre-existing chrome uses em-dashes deliberately).
const PLAIN_ASCII_SCOPE = "blog-body";
const KNOWN_DEBTS = [];
// -------------------------

const DIST = "dist";
const failures = [];
const notes = [];
const debt = (file, check) =>
  KNOWN_DEBTS.find((d) => d.file === file && d.check === check);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error("aio-check: no dist/ — run the build first");
  process.exit(2);
}

// Post lists from BOTH ends: a post that fails to build is loud, and a
// dist-only leftover is loud too.
const srcPosts = existsSync("src/content/blog")
  ? readdirSync("src/content/blog")
      .filter((f) => f.endsWith(".mdx"))
      .filter((f) => {
        const raw = readFileSync(join("src/content/blog", f), "utf8");
        const end = raw.indexOf("---", 4);
        if (end < 0) {
          notes.push(`WARN ${f}: no closing frontmatter fence; treated as published`);
          return true;
        }
        return !/^draft:\s*true/m.test(raw.slice(0, end));
      })
      .map((f) => f.replace(/\.mdx$/, ""))
  : [];
const distPosts = existsSync(join(DIST, "blog"))
  ? readdirSync(join(DIST, "blog")).filter((d) =>
      existsSync(join(DIST, "blog", d, "index.html")),
    )
  : [];
for (const s of srcPosts)
  if (!distPosts.includes(s)) failures.push(`post did not build: ${s}`);
for (const d of distPosts)
  if (!srcPosts.includes(d)) failures.push(`dist-only leftover post: ${d}`);

const pickGraph = (html) => {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      if (j["@graph"]) return j;
    } catch {
      /* fall through */
    }
  }
  return blocks.length ? "unparseable-or-no-graph" : null;
};

const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
let sawNoopener = false;
for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  if (rel === "404.html") continue;
  const html = readFileSync(file, "utf8");
  if (html.includes('http-equiv="refresh"')) continue; // redirect stubs
  const isBlogPage = rel.startsWith("blog/");
  const isPostPage = isBlogPage && rel !== "blog/index.html";
  if (html.includes('rel="noopener')) sawNoopener = true;

  if (!html.includes('rel="canonical"')) failures.push(`${rel}: no canonical`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html))
    failures.push(`${rel}: missing/short meta description`);

  const graph = pickGraph(html);
  if (!graph) failures.push(`${rel}: no JSON-LD`);
  else if (graph === "unparseable-or-no-graph")
    failures.push(`${rel}: JSON-LD present but unparseable or graph-less`);
  else if (isPostPage) {
    const bp = graph["@graph"].find((n) => n["@type"] === "BlogPosting");
    if (!bp) failures.push(`${rel}: post page without BlogPosting node`);
    else
      for (const k of ["headline", "datePublished", "dateModified", "author", "image", "description"])
        if (!(k in bp)) failures.push(`${rel}: BlogPosting missing ${k}`);
  } else if (rel === "blog/index.html") {
    if (!graph["@graph"].some((n) => n["@type"] === "Blog"))
      failures.push(`${rel}: listing without Blog node`);
  }

  const twin = html.match(
    /<link rel="alternate" type="text\/markdown" href="([^"]+)"/,
  );
  if (!twin) failures.push(`${rel}: no markdown-twin link tag`);
  else if (!existsSync(join(DIST, twin[1].replace(/^\//, ""))))
    failures.push(`${rel}: twin ${twin[1]} did not build`);

  for (const marker of ["[LINK", "[PIVOT", "[TALARIA]", "[[FIG", "DERIVATIVE KIT", "FIGURE JAM"])
    if (html.includes(marker)) failures.push(`${rel}: unresolved ${marker}`);

  // Plain-ASCII (scoped per repo config)
  if (PLAIN_ASCII_SCOPE === "all" || isBlogPage) {
    const scanText =
      PLAIN_ASCII_SCOPE === "blog-body"
        ? html.replace(/<head>[\s\S]*?<\/head>/, "")
        : html;
    const badChars = scanText.match(/[‘’“”–—]/g);
    if (badChars) {
      const d = debt(rel, "plain-ascii");
      if (d && badChars.length <= d.maxCount)
        notes.push(`KNOWN DEBT ${rel}: ${badChars.length}x non-ASCII (${d.why})`);
      else
        failures.push(
          `${rel}: ${badChars.length}x non-ASCII punctuation${d ? " (exceeds debt bound)" : ""}`,
        );
    }
  }

  if (isPostPage) {
    if (!html.includes('property="article:published_time"'))
      failures.push(`${rel}: no article:published_time`);
    const og = html.match(/property="og:image" content="([^"]+)"/);
    const slug = rel.split("/")[1];
    if (!og || !og[1].endsWith(`/blog/${slug}/og.png`))
      failures.push(`${rel}: og:image is not the per-post card`);
    else {
      const ogPath = join(DIST, "blog", slug, "og.png");
      if (!existsSync(ogPath)) failures.push(`${rel}: og.png did not build`);
      else if (statSync(ogPath).size < 5000)
        failures.push(`${rel}: og.png suspiciously small (<5KB)`);
    }
    // Heading anchors = the processor pin actually ran (silent-fallback guard)
    if (html.includes("<h2") && !/<h2 id="/.test(html))
      failures.push(`${rel}: h2 without id — markdown processor pin not applied?`);
    // Figure PNG twins referenced by data-png must ship
    for (const m of html.matchAll(/data-png="([^"]+)"/g))
      if (!existsSync(join(DIST, m[1].replace(/^\//, ""))))
        failures.push(`${rel}: figure PNG twin missing: ${m[1]}`);
  }
}
if (htmlFiles.length && distPosts.length && !sawNoopener)
  failures.push(`no rel="noopener" anywhere — external-links plugin not running?`);

if (distPosts.length) {
  const index = readFileSync(join(DIST, "blog/index.html"), "utf8");
  for (const s of distPosts)
    if (!index.includes(`/blog/${s}`)) failures.push(`blog index missing ${s}`);
}

// Twins + llms surfaces must be component-free plain markdown
for (const s of distPosts) {
  const twinPath = join(DIST, "blog", `${s}.md`);
  if (!existsSync(twinPath)) continue; // caught above via link tag
  const md = readFileSync(twinPath, "utf8");
  for (const bad of ["<Figure", "<YouTubeFacade"])
    if (md.includes(bad)) failures.push(`twin ${s}.md leaks ${bad}`);
  if (/^import /m.test(md)) failures.push(`twin ${s}.md leaks an import line`);
}

const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
const llmsFull = readFileSync(join(DIST, "llms-full.txt"), "utf8");
const rssXml = readFileSync(join(DIST, "rss.xml"), "utf8");
const sitemaps = readdirSync(DIST)
  .filter((f) => /^sitemap.*\.xml$/.test(f))
  .map((f) => readFileSync(join(DIST, f), "utf8"))
  .join("\n");
for (const s of distPosts) {
  if (!llms.includes(`/blog/${s}.md`)) failures.push(`llms.txt missing ${s}`);
  if (!llmsFull.includes(`/blog/${s}`)) failures.push(`llms-full.txt missing ${s}`);
  if (!sitemaps.includes(`/blog/${s}`)) failures.push(`sitemap missing ${s}`);
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`/blog/${esc}/?</loc><lastmod>`).test(sitemaps))
    failures.push(`sitemap lastmod missing for ${s}`);
}
const itemCount = (rssXml.match(/<item>/g) ?? []).length;
if (itemCount !== distPosts.length)
  failures.push(`rss.xml has ${itemCount} items, expected ${distPosts.length}`);
for (const bad of ["&lt;Figure", "&lt;YouTubeFacade", 'src=&quot;/']) {
  if (rssXml.includes(bad)) failures.push(`rss.xml contains ${bad} (unrendered/unabsolutized)`);
}
if (itemCount && !rssXml.includes(`<link>${SITE_URL}/blog/`))
  failures.push(`rss.xml item links are not absolute ${SITE_URL} URLs`);

const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
for (const must of [
  "Content-Signal:",
  "ai-train=yes",
  "User-agent: GPTBot",
  "User-agent: ClaudeBot",
  "Sitemap:",
])
  if (!robots.includes(must)) failures.push(`robots.txt missing "${must}"`);

for (const n of notes) console.log("  " + n);
if (failures.length) {
  console.error(`\naio-check: ${failures.length} FAILURE(S)`);
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log(
  `aio-check: OK — ${htmlFiles.length} pages, ${distPosts.length} posts, all AIO invariants hold`,
);
