#!/usr/bin/env node
// AIO regression gate v3 — asserts the estate's SEO/AIO invariants over dist/
// so "we never lose an AIO trick" is CHECKED, not remembered. Runs in CI
// between build and deploy (deploy.yml) and locally via `npm run check:aio`.
// Estate contract: vault Projects/content_factory/blog-grammar.md § gate.
// v2 additions: 2026-07-23 referee round 1 (grok/inkling adjudication).
// v3 additions: same-day sol adjudication — exact-set coverage, RSS/OG
// content verification, robots GROUP parsing, committed-SVG lint, exact
// debt pinning, lastmod truth-check, and the video-lane tooth.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// ---- per-repo config ----
const SITE_URL = "https://scottclark.io";
// "all" = whole file; "blog-body" = blog pages only, <head> stripped (for
// sites whose pre-existing chrome uses em-dashes deliberately).
const PLAIN_ASCII_SCOPE = "blog-body";
// The video lane is TOOTH-PARKED: no published `format: video` post until the
// feed-safe facade rewrite + self-hosted posters land (sol S10/S22,
// 2026-07-23; vault SPEC-blog-surfaces). Flip only with that work done.
const VIDEO_LANE_OPEN = false;
// Debts are EXACT-pinned (sol S20): count drift in EITHER direction fails —
// up is a regression, down means the debt cleared and the pin must go.
const KNOWN_DEBTS = [];
// Exact-value channel identity (sol S12 — exact, never a heuristic).
const RSS_CHANNEL_TITLE = "Writing by Scott Clark";
// The estate's ONE cross-domain author identity (sol S11).
const AUTHOR_ID = "https://scottclark.io/#person";
// -------------------------

const DIST = "dist";
const failures = [];
const notes = [];
const debtFor = (file, check) =>
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

const eqSets = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// Decode the HTML-entity spellings of the banned punctuation before the
// plain-ASCII scan — `&mdash;` must not evade the gate (sol S20).
const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”");

// Frontmatter extraction — the fields the gate reads are single-line scalars
// by grammar; no YAML dep needed.
function readFm(raw) {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = raw.slice(0, end);
  const get = (k) =>
    fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*?)"?\\s*$`, "m"))?.[1]?.trim();
  return {
    draft: /^draft:\s*true\s*$/m.test(fm),
    format: get("format") ?? "post",
    title: get("title"),
    date: get("date"),
    updated: get("updated"),
    usesFacade: raw.includes("<YouTubeFacade"),
  };
}

if (!existsSync(DIST)) {
  console.error("aio-check: no dist/ — run the build first");
  process.exit(2);
}

// ---- source scan: flat by contract, drafts excluded, video tooth ----
const SRC_BLOG = "src/content/blog";
const srcMeta = new Map(); // slug -> readFm() result
if (existsSync(SRC_BLOG)) {
  for (const name of readdirSync(SRC_BLOG)) {
    const p = join(SRC_BLOG, name);
    if (statSync(p).isDirectory()) {
      // The loader pattern is "*.mdx": a nested post would be INVISIBLE to
      // routes/lastmod/this gate rather than misrouted (sol S14) — refuse.
      failures.push(
        `src/content/blog/${name}/ is a directory — the blog collection is flat by contract (blog-grammar.md)`,
      );
      continue;
    }
    if (!name.endsWith(".mdx")) continue;
    const fm = readFm(readFileSync(p, "utf8"));
    if (!fm) {
      notes.push(`WARN ${name}: no frontmatter fence; treated as published`);
      srcMeta.set(name.replace(/\.mdx$/, ""), { format: "post" });
      continue;
    }
    if (fm.draft) continue;
    const slug = name.replace(/\.mdx$/, "");
    srcMeta.set(slug, fm);
    if (fm.format === "video" && !VIDEO_LANE_OPEN)
      failures.push(
        `${slug}: published format "video" while the video lane is tooth-parked — land the feed-safe facade rewrite + self-hosted posters first (sol S10/S22, SPEC-blog-surfaces)`,
      );
  }
}
const srcPosts = [...srcMeta.keys()];
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

// ---- per-page checks ----
const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
let sawNoopener = false;
for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  if (rel === "404.html") continue;
  const html = readFileSync(file, "utf8");
  if (html.includes('http-equiv="refresh"')) continue; // redirect stubs
  const isBlogPage = rel.startsWith("blog/");
  const isPostPage = isBlogPage && rel !== "blog/index.html";
  const slug = isPostPage ? rel.split("/")[1] : null;
  if (html.includes('rel="noopener')) sawNoopener = true;

  if (!html.includes('rel="canonical"')) failures.push(`${rel}: no canonical`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html))
    failures.push(`${rel}: missing/short meta description`);

  // Zero-client-JS contract (sol S19): no islands anywhere; no scripts beyond
  // JSON-LD except the facade on pages whose SOURCE uses it.
  if (html.includes("<astro-island"))
    failures.push(`${rel}: <astro-island> — client JS violates the estate contract`);
  const nonLd = html.replace(
    /<script[^>]*type="application\/ld\+json"[\s\S]*?<\/script>/g,
    "",
  );
  if (/<script[\s>]/.test(nonLd)) {
    const allowed = isPostPage && srcMeta.get(slug)?.usesFacade;
    if (!allowed)
      failures.push(`${rel}: unexpected <script> (only the YouTube facade may ship JS)`);
  }

  const graph = pickGraph(html);
  if (!graph) failures.push(`${rel}: no JSON-LD`);
  else if (graph === "unparseable-or-no-graph")
    failures.push(`${rel}: JSON-LD present but unparseable or graph-less`);
  else if (isPostPage) {
    const bp = graph["@graph"].find((n) => n["@type"] === "BlogPosting");
    const fm = srcMeta.get(slug);
    if (!bp) failures.push(`${rel}: post page without BlogPosting node`);
    else {
      for (const k of [
        "headline",
        "datePublished",
        "dateModified",
        "author",
        "image",
        "description",
        "publisher",
        "url",
      ])
        if (!(k in bp)) failures.push(`${rel}: BlogPosting missing ${k}`);
      // Exact identity, not string-presence (sol S7):
      const canonical = `${SITE_URL}/blog/${slug}`;
      if (bp["@id"] !== `${canonical}#article`)
        failures.push(`${rel}: BlogPosting @id ${bp["@id"]} != ${canonical}#article`);
      if (bp.url !== canonical)
        failures.push(`${rel}: BlogPosting url ${bp.url} != ${canonical}`);
      if (!String(bp.image).endsWith(`/blog/${slug}/og.png`))
        failures.push(`${rel}: BlogPosting image is not the per-post og card`);
      if (fm?.title && bp.headline !== fm.title)
        failures.push(`${rel}: headline "${bp.headline}" != frontmatter title`);
      if (fm?.date && new Date(bp.datePublished).getTime() !== new Date(fm.date).getTime())
        failures.push(`${rel}: datePublished != frontmatter date`);
      const author = bp.author ?? {};
      // The estate's ONE cross-domain Person identity (sol S11): either an
      // inline Person node (company sites) or a bare @id graph reference
      // (scottclarkio, where the full #person node lives in the same @graph).
      if (author["@id"] !== AUTHOR_ID && !author.name)
        failures.push(`${rel}: BlogPosting author has neither the estate @id nor a name`);
      if (author.name === "Scott Clark" && author["@id"] !== AUTHOR_ID)
        failures.push(`${rel}: Scott Clark author node missing @id ${AUTHOR_ID}`);
      if (fm?.format === "video" && bp.video?.["@type"] !== "VideoObject")
        failures.push(`${rel}: format video without VideoObject`);
    }
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

  // Plain-ASCII (scoped per repo config; entities decoded first — sol S20)
  if (PLAIN_ASCII_SCOPE === "all" || isBlogPage) {
    const scanText = decodeEntities(
      PLAIN_ASCII_SCOPE === "blog-body"
        ? html.replace(/<head>[\s\S]*?<\/head>/, "")
        : html,
    );
    const badCount = (scanText.match(/[‘’“”–—]/g) ?? []).length;
    const d = debtFor(rel, "plain-ascii");
    if (d) {
      if (badCount === d.exactCount)
        notes.push(`KNOWN DEBT ${rel}: ${badCount}x non-ASCII (${d.why})`);
      else
        failures.push(
          `${rel}: ${badCount}x non-ASCII but the debt pin says ${d.exactCount} — fix the regression, or re-pin deliberately if the debt shrank`,
        );
    } else if (badCount) {
      failures.push(`${rel}: ${badCount}x non-ASCII punctuation`);
    }
  }

  if (isPostPage) {
    if (!html.includes('property="article:published_time"'))
      failures.push(`${rel}: no article:published_time`);
    const og = html.match(/property="og:image" content="([^"]+)"/);
    if (!og || !og[1].endsWith(`/blog/${slug}/og.png`))
      failures.push(`${rel}: og:image is not the per-post card`);
    else {
      const ogPath = join(DIST, "blog", slug, "og.png");
      if (!existsSync(ogPath)) failures.push(`${rel}: og.png did not build`);
      else {
        // Real 1200x630 PNG, not just a file (sol S18): signature + IHDR.
        const buf = readFileSync(ogPath);
        const isPng = buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47;
        const w = isPng ? buf.readUInt32BE(16) : 0;
        const h = isPng ? buf.readUInt32BE(20) : 0;
        if (!isPng || w !== 1200 || h !== 630)
          failures.push(`${rel}: og.png is not a 1200x630 PNG (got ${w}x${h})`);
        else if (buf.length < 5000)
          failures.push(`${rel}: og.png suspiciously small (<5KB)`);
      }
    }
    // Heading anchors: unique ids + wrapped self-links = the processor pin
    // actually ran end to end (sol S19 tightening the v2 presence check).
    const hIds = [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    const seen = new Set();
    for (const id of hIds) {
      if (seen.has(id)) failures.push(`${rel}: duplicate heading id "${id}"`);
      seen.add(id);
      if (!html.includes(`<a href="#${id}"`))
        failures.push(`${rel}: heading "${id}" has no self-link (autolink plugin not running?)`);
    }
    if (html.includes("<h2") && hIds.length === 0)
      failures.push(`${rel}: h2 without id — markdown processor pin not applied?`);
    // Figure PNG twins referenced by data-png must ship
    for (const m of html.matchAll(/data-png="([^"]+)"/g))
      if (!existsSync(join(DIST, m[1].replace(/^\//, ""))))
        failures.push(`${rel}: figure PNG twin missing: ${m[1]}`);
  }
}
if (htmlFiles.length && distPosts.length && !sawNoopener)
  failures.push(`no rel="noopener" anywhere — external-links plugin not running?`);

// ---- listing coverage: exact set, both directions (sol S17) ----
if (distPosts.length) {
  const index = readFileSync(join(DIST, "blog/index.html"), "utf8");
  const postHrefs = new Set(
    [...index.matchAll(/href="(\/blog\/[^"]+)"/g)]
      .map((m) => m[1])
      .filter((h) => /^\/blog\/[^/.]+$/.test(h)),
  );
  const expected = new Set(distPosts.map((s) => `/blog/${s}`));
  if (!eqSets(postHrefs, expected))
    failures.push(
      `blog index link set != posts: [${[...postHrefs]}] vs [${[...expected]}]`,
    );
}

// ---- twins must be component-free plain markdown ----
for (const s of distPosts) {
  const twinPath = join(DIST, "blog", `${s}.md`);
  if (!existsSync(twinPath)) continue; // caught above via link tag
  const md = readFileSync(twinPath, "utf8");
  for (const bad of ["<Figure", "<YouTubeFacade"])
    if (md.includes(bad)) failures.push(`twin ${s}.md leaks ${bad}`);
  if (/^import /m.test(md)) failures.push(`twin ${s}.md leaks an import line`);
}

// ---- corpus surfaces: exact coverage (sol S13/S17) ----
const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
const llmsFull = readFileSync(join(DIST, "llms-full.txt"), "utf8");
const rssXml = readFileSync(join(DIST, "rss.xml"), "utf8");
const sitemaps = readdirSync(DIST)
  .filter((f) => /^sitemap.*\.xml$/.test(f))
  .map((f) => readFileSync(join(DIST, f), "utf8"))
  .join("\n");

if (distPosts.length) {
  const twinLinks = new Set(
    [...llms.matchAll(/\((?:[^)]*?)\/blog\/([^)/]+)\.md\)/g)].map((m) => m[1]),
  );
  if (!eqSets(twinLinks, new Set(distPosts)))
    failures.push(
      `llms.txt blog twins != posts: [${[...twinLinks]}] vs [${distPosts}]`,
    );
  if (!llms.includes(`${SITE_URL}/blog.md`))
    failures.push(`llms.txt does not link the /blog.md listing twin (sol S13)`);
  if (!llmsFull.includes(`Source: ${SITE_URL}/blog (`))
    failures.push(`llms-full.txt missing the blog listing section (sol S13)`);
  for (const s of distPosts)
    if (!llmsFull.includes(`Canonical: ${SITE_URL}/blog/${s}`))
      failures.push(`llms-full.txt missing post ${s}`);
}

// ---- sitemap: exact locs + truthful lastmod (sol S15/S17) ----
const urlEntries = [...sitemaps.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1],
  lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
}));
const locMap = new Map(
  urlEntries.map((e) => [e.loc?.replace(/\/$/, ""), e]),
);
for (const s of distPosts) {
  const e = locMap.get(`${SITE_URL}/blog/${s}`);
  if (!e) {
    failures.push(`sitemap missing ${s}`);
    continue;
  }
  const fm = srcMeta.get(s);
  const src = fm?.updated ?? fm?.date;
  if (src) {
    const expected = new Date(src).getTime();
    if (!e.lastmod || new Date(e.lastmod).getTime() !== expected)
      failures.push(
        `sitemap lastmod for ${s}: ${e.lastmod ?? "absent"} != frontmatter ${new Date(src).toISOString()}`,
      );
  }
}
for (const e of urlEntries)
  if (e.lastmod && !/\/blog\/[^/.]+\/?$/.test(e.loc ?? ""))
    failures.push(
      `sitemap lastmod on non-post URL ${e.loc} — only truthful per-post dates allowed`,
    );

// ---- RSS: exact items, real content, strict order, channel identity ----
const items = [...rssXml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
if (items.length !== distPosts.length)
  failures.push(`rss.xml has ${items.length} items, expected ${distPosts.length}`);
if (distPosts.length) {
  const unc = (s) => s?.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
  const itemLinks = new Set(
    items.map((i) => unc(i.match(/<link>([\s\S]*?)<\/link>/)?.[1])?.trim()),
  );
  const expected = new Set(distPosts.map((s) => `${SITE_URL}/blog/${s}`));
  if (!eqSets(itemLinks, expected))
    failures.push(`rss item links != posts: [${[...itemLinks]}] vs [${[...expected]}]`);
  let prev = Infinity;
  for (const i of items) {
    const t = new Date(i.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? NaN).getTime();
    if (Number.isNaN(t)) failures.push(`rss item without a parseable pubDate`);
    else if (t > prev)
      failures.push(`rss items not in strict date order (sol S12 — pinning must not contaminate the feed)`);
    prev = Math.min(prev, t);
    const content = i.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1] ?? "";
    if (content.length < 300)
      failures.push(`rss item has empty/thin content — full-content feed broken`);
  }
  const chTitle =
    rssXml.match(/<channel>\s*<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? "";
  if (chTitle !== RSS_CHANNEL_TITLE)
    failures.push(`rss channel title "${chTitle}" != "${RSS_CHANNEL_TITLE}" (sol S12)`);
}
for (const bad of ["&lt;Figure", "&lt;YouTubeFacade", 'src=&quot;/'])
  if (rssXml.includes(bad)) failures.push(`rss.xml contains ${bad} (unrendered/unabsolutized)`);
// Feed-safety tooth (sol S10): facade markup must never reach the feed.
for (const bad of ["yt-facade", "<button", "&lt;button"])
  if (rssXml.includes(bad))
    failures.push(`rss.xml contains "${bad}" — facade markup is not feed-safe (sol S10)`);

// ---- robots.txt: GROUP-parsed Content-Signal (sol S9) ----
const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
const CS = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";
function robotsGroups(txt) {
  const groups = [];
  let cur = null;
  let curClosed = false; // saw a directive after the UA lines
  for (const line of txt.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const m = l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (/^user-agent$/i.test(key)) {
      if (cur && curClosed) {
        groups.push(cur);
        cur = null;
      }
      if (!cur) {
        cur = { agents: [], directives: [] };
        curClosed = false;
      }
      cur.agents.push(val);
    } else if (/^sitemap$/i.test(key)) {
      continue; // file-level line, not a group directive
    } else if (cur) {
      cur.directives.push(`${key}: ${val}`);
      curClosed = true;
    }
  }
  if (cur) groups.push(cur);
  return groups;
}
const groups = robotsGroups(robots);
const starGroup = groups.find((g) => g.agents.includes("*"));
if (!starGroup) failures.push("robots.txt: no * group");
else if (!starGroup.directives.includes(CS))
  failures.push(`robots.txt: * group does not carry the exact Content-Signal INSIDE the group (sol S9)`);
for (const ua of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
  const g = groups.find((x) =>
    x.agents.some((a) => a.toLowerCase() === ua.toLowerCase()),
  );
  if (!g) failures.push(`robots.txt: no group covers ${ua}`);
  else if (!g.directives.includes(CS))
    failures.push(`robots.txt: ${ua}'s group does not carry the exact Content-Signal (sol S9)`);
}
if (!/^sitemap:/im.test(robots)) failures.push(`robots.txt missing "Sitemap:"`);

// ---- committed-SVG lint: inline-embedded, so must be inert (sol S24) ----
const SVG_SRC = "src/assets/blog";
if (existsSync(SVG_SRC)) {
  for (const f of walk(SVG_SRC).filter((x) => x.endsWith(".svg"))) {
    const svg = readFileSync(f, "utf8");
    if (/<script\b/i.test(svg)) failures.push(`${f}: <script> in committed SVG`);
    if (/\son[a-z]+\s*=/i.test(svg))
      failures.push(`${f}: event-handler attribute in committed SVG`);
    if (/<foreignObject\b/i.test(svg)) failures.push(`${f}: foreignObject in SVG`);
    if (
      /(?:xlink:href|href|src)\s*=\s*"(?:https?:)?\/\//i.test(svg) ||
      /url\(\s*['"]?https?:/i.test(svg)
    )
      failures.push(`${f}: external resource reference — inline SVGs must be self-contained`);
  }
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
