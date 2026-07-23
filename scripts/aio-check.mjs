#!/usr/bin/env node
// AIO regression gate — asserts the estate's SEO/AIO invariants over dist/
// so "we never lose an AIO trick" is CHECKED, not remembered. Runs in CI
// between build and deploy (deploy.yml) and locally via `npm run check:aio`.
// Estate contract: vault Projects/content_factory/blog-grammar.md § gate.
//
// scottclarkio VARIANCE: the plain-ASCII scan runs on BLOG pages only, with
// the <head> stripped — the site's pre-existing chrome (titles like
// "Scott Clark — ...") uses em-dashes deliberately and predates the factory
// plain-ASCII rule, which governs content. Factory content stays strict.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const failures = [];
const notes = [];

const KNOWN_DEBTS = [];

function debt(file, check) {
  return KNOWN_DEBTS.find((d) => d.file === file && d.check === check);
}

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

const srcPosts = existsSync("src/content/blog")
  ? readdirSync("src/content/blog")
      .filter((f) => f.endsWith(".mdx"))
      .filter((f) => {
        const fm = readFileSync(join("src/content/blog", f), "utf8");
        return !/^draft:\s*true/m.test(fm.slice(0, fm.indexOf("---", 4)));
      })
      .map((f) => f.replace(/\.mdx$/, ""))
  : [];
const distPosts = existsSync(join(DIST, "blog"))
  ? readdirSync(join(DIST, "blog")).filter((d) =>
      existsSync(join(DIST, "blog", d, "index.html")),
    )
  : [];
for (const s of srcPosts) {
  if (!distPosts.includes(s)) failures.push(`post did not build: ${s}`);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  if (rel === "404.html") continue;
  const html = readFileSync(file, "utf8");
  // Astro renders `redirects` config entries as meta-refresh stub pages —
  // they carry no head surface and are not indexable content. Skip them.
  if (html.includes('http-equiv="refresh"')) continue;
  const isBlogPage = rel.startsWith("blog/");
  const isPostPage = isBlogPage && rel !== "blog/index.html";

  if (!html.includes('rel="canonical"')) failures.push(`${rel}: no canonical`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html))
    failures.push(`${rel}: missing/short meta description`);

  const ld = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (!ld) failures.push(`${rel}: no JSON-LD`);
  else {
    try {
      const graph = JSON.parse(ld[1]);
      if (!graph["@graph"]?.length) failures.push(`${rel}: empty JSON-LD @graph`);
      if (isPostPage && !JSON.stringify(graph).includes('"BlogPosting"'))
        failures.push(`${rel}: post page without BlogPosting node`);
    } catch (e) {
      failures.push(`${rel}: JSON-LD unparseable (${e.message})`);
    }
  }

  const twin = html.match(
    /<link rel="alternate" type="text\/markdown" href="([^"]+)"/,
  );
  if (!twin) failures.push(`${rel}: no markdown-twin link tag`);
  else {
    const twinPath = join(DIST, twin[1].replace(/^\//, ""));
    if (!existsSync(twinPath))
      failures.push(`${rel}: twin ${twin[1]} did not build`);
  }

  for (const marker of [
    "[LINK",
    "[PIVOT",
    "[TALARIA]",
    "[[FIG",
    "DERIVATIVE KIT",
    "FIGURE JAM",
  ]) {
    if (html.includes(marker)) failures.push(`${rel}: unresolved ${marker}`);
  }

  // Plain-ASCII rule — factory content scope (blog pages, head stripped).
  if (isBlogPage) {
    const body = html.replace(/<head>[\s\S]*?<\/head>/, "");
    const badChars = body.match(/[‘’“”–—]/g);
    if (badChars) {
      const d = debt(rel, "plain-ascii");
      if (d) notes.push(`KNOWN DEBT ${rel}: ${badChars.length}x non-ASCII (${d.why})`);
      else failures.push(`${rel}: ${badChars.length}x non-ASCII punctuation in body`);
    }
  }

  if (isPostPage) {
    if (!html.includes('property="article:published_time"'))
      failures.push(`${rel}: no article:published_time`);
    const og = html.match(/property="og:image" content="([^"]+)"/);
    const slug = rel.split("/")[1];
    if (!og || !og[1].endsWith(`/blog/${slug}/og.png`))
      failures.push(`${rel}: og:image is not the per-post card`);
    else if (!existsSync(join(DIST, "blog", slug, "og.png")))
      failures.push(`${rel}: og.png did not build`);
  }
}

if (distPosts.length) {
  const index = readFileSync(join(DIST, "blog/index.html"), "utf8");
  for (const s of distPosts) {
    if (!index.includes(`/blog/${s}`)) failures.push(`blog index missing ${s}`);
  }
}

const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
const llmsFull = readFileSync(join(DIST, "llms-full.txt"), "utf8");
const rssXml = readFileSync(join(DIST, "rss.xml"), "utf8");
const sitemap = readFileSync(join(DIST, "sitemap-0.xml"), "utf8");
for (const s of distPosts) {
  if (!llms.includes(`/blog/${s}.md`)) failures.push(`llms.txt missing ${s}`);
  if (!llmsFull.includes(`/blog/${s}`)) failures.push(`llms-full.txt missing ${s}`);
  if (!sitemap.includes(`/blog/${s}`)) failures.push(`sitemap missing ${s}`);
}
const itemCount = (rssXml.match(/<item>/g) ?? []).length;
if (itemCount !== distPosts.length)
  failures.push(`rss.xml has ${itemCount} items, expected ${distPosts.length}`);

const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
for (const must of ["Content-Signal:", "User-agent: GPTBot", "User-agent: ClaudeBot"]) {
  if (!robots.includes(must)) failures.push(`robots.txt missing "${must}"`);
}

for (const n of notes) console.log("  " + n);
if (failures.length) {
  console.error(`\naio-check: ${failures.length} FAILURE(S)`);
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log(
  `aio-check: OK — ${htmlFiles.length} pages, ${distPosts.length} posts, all AIO invariants hold`,
);
