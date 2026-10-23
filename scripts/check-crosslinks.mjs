#!/usr/bin/env node
// Cross-link gate v2 — asserts the estate's cross-property + related-post
// linking invariants over dist/, so "we mention it, we link it" is CHECKED,
// not remembered (Scott, 2026-07-24). Runs in CI between build and deploy
// (deploy.yml), on the manual path (scripts/deploy.sh), and locally via
// `npm run check:links`. Estate contract: vault
// Projects/content_factory/blog-grammar.md § gate.
//
// Rule semantics, per rendered page and per rule: IF the page's <main>
// visible text matches any of the rule's `needles`, THEN the page must carry
// >=1 <a> whose href matches `target` AND whose own visible text matches a
// needle of the SAME rule — the brand/title PHRASE must be a link somewhere
// on the page, never only plain text. "A link to the host exists elsewhere"
// does not pass: the pivot post linked talariasci.com three times while
// "Talaria Scientific" stayed plain text (the founding incident of this
// gate). Pages whose own path IS a relative target are exempt (a post never
// links itself); EXCLUDE carries deliberate opt-outs, each WITH a reason,
// and a stale exclude (one that no longer suppresses anything) FAILS.
//
// v2 (2026-10-23, Scott: /talks named its recap posts by SLUG, as plain
// text — "the correct way to do this is to have the title of the post and
// have it actually link"). Two rule classes DERIVED from the build join the
// hand-written property rules, so no per-post needle is ever maintained:
//   1. bare-path — a site-internal path (`/blog/<slug>`, `/talks`,
//      `scottclark.io/…`) appearing as visible PROSE fails outright, linked
//      or not: a path is never link text; the target's TITLE is. Prose =
//      <main> minus <code>/<pre> (a how-I-built-this post may quote a path
//      as a path).
//   2. post-title — one rule per published post page in dist/ (its JSON-LD
//      BlogPosting headline, the identity the AIO gate pins): a page that
//      names the post by title must link it by that title. A recap post's
//      headline minus its "(… recap)" qualifier is the talk's own title, so
//      the needle carries both forms and /talks must link each recap.
// Read-next cards (`<section class="related">`) are navigation chrome, not
// body citations: out of scope for mentions AND anchors (estate rule
// 2026-08-28, previously only on talaria-site).
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// ---- per-repo config ----
const SITE_HOST = /^https?:\/\/(?:www\.)?scottclark\.io/;
// Site-internal path roots that are never prose. `/slides/…` is a download
// (its anchor text is "Slides"/"Download the slides"), never a reference.
const PATH_ROOTS = "blog|talks|press|projects|publications|cv|figures|slides";
// Sibling properties this site must link when it names them. "Scott Clark"
// is this property. Post rules are DERIVED below (postRulesFromDist).
const RULES = [
  {
    id: "talaria",
    target: /^https?:\/\/(www\.)?talariasci\.com/,
    needles: [/Talaria/],
  },
  {
    id: "distributional",
    target: /^https?:\/\/(www\.)?distributional\.com/,
    needles: [/Distributional/],
  },
  {
    // tauopt.com went live 2026-10-14; the first post naming TauOpt (the OSU
    // recap, 2026-10-19) carries the link, so the law gets its tooth here.
    id: "tauopt",
    target: /^https?:\/\/(www\.)?tauopt\.com/,
    needles: [/TauOpt/],
  },
];
// Deliberate opt-outs: { path: <regex>, rule: <id>, why: <reason> }. Logged
// as KNOWN-EXEMPT notes; an exclude that stops suppressing anything fails.
// Rule ids: a property id above, `post:<slug>` for a derived post rule, or
// `bare-path`.
const EXCLUDE = [
  {
    path: /^figures\/index\.html$/,
    rule: "distributional",
    why: "the figures index quotes captions and post titles verbatim from the posts; the source posts carry the property links (figure focus, 2026-10-01)",
  },
  {
    path: /^figures\/index\.html$/,
    rule: "talaria",
    why: "the figures index quotes captions and post titles verbatim from the posts; the source posts carry the property links (figure focus, 2026-10-01)",
  },
  {
    path: /^figures\/index\.html$/,
    rule: "tauopt",
    why: "the figures index quotes captions and post titles verbatim from the posts; the source posts carry the property links (figure focus, 2026-10-01; the tauopt rule, 2026-10-19)",
  },
  {
    path: /^press\/index\.html$/,
    rule: "distributional",
    why: "press excerpts are verbatim third-party quotes (provenance: never edit or markup another publisher's words); each entry's outbound link is the article itself",
  },
];
// -------------------------

const DIST = "dist";
const failures = [];
const notes = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Visible text of an HTML region: scripts/styles/SVG out, tags out,
// entities decoded, whitespace collapsed.
const visibleText = (s) =>
  decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");

// Typographic quotes → ASCII so a title with a curly apostrophe matches its
// straight-quoted mention (and vice versa). Applied to needle sources and to
// the text they are tested against — never to the HTML itself.
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Content region = <main>; chrome (nav/footer) stays out of scope so a
// site-wide footer mention can't trip (or satisfy) a per-page rule. Read-next
// cards are chrome too.
const mainRegion = (html) => {
  const m = html.match(/<main\b[\s\S]*?<\/main>/i);
  const region = m ? m[0] : (html.match(/<body\b[\s\S]*?<\/body>/i)?.[0] ?? html);
  return region.replace(/<section class="related">[\s\S]*?<\/section>/gi, " ");
};

// Prose region for the bare-path class: code samples may quote a path.
const proseRegion = (region) =>
  region
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code\b[\s\S]*?<\/code>/gi, " ");

// A site path as prose: optional own-host prefix (with or without a scheme —
// "scottclark.io/talks" is the same defect as "/talks"), a known root,
// optional segments (a dot only INSIDE a segment, so a sentence-ending period
// stays out of the capture), bounded by whitespace/punctuation on both sides
// so an unrelated token ("A/B", "argmax f(x)") cannot match.
const BARE_PATH = new RegExp(
  `(?:^|[\\s(\\["'“‘])((?:(?:https?://)?(?:www\\.)?scottclark\\.io)?/(?:${PATH_ROOTS})(?:/[A-Za-z0-9_~-]+(?:\\.[A-Za-z0-9_~-]+)*)*/?)(?=$|[\\s)\\]"'”’.,;:!?])`,
  "g",
);

// One rule per published post page: needles = the BlogPosting headline (the
// AIO gate pins headline == frontmatter title) and, for recaps, the headline
// without its trailing "(… recap)" qualifier — the talk's own title.
function postRulesFromDist(htmlFiles) {
  const rules = [];
  for (const file of htmlFiles) {
    const m = file.match(/^dist\/blog\/([^/]+)\/index\.html$/);
    if (!m) continue;
    const slug = m[1];
    const html = readFileSync(file, "utf8");
    let headline = null;
    for (const s of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let data;
      try {
        data = JSON.parse(s[1]);
      } catch {
        failures.push(`blog/${slug}/index.html: unparseable JSON-LD — the post-title rule cannot be derived`);
        continue;
      }
      const nodes = Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
      const post = nodes.find((n) => n?.["@type"] === "BlogPosting" && typeof n.headline === "string");
      if (post) headline = post.headline;
    }
    if (!headline) {
      failures.push(`blog/${slug}/index.html: no BlogPosting headline in JSON-LD — the post-title rule cannot be derived`);
      continue;
    }
    const title = norm(headline);
    const bare = title.replace(/\s*\([^()]*\brecap\)$/i, "");
    const needles = [new RegExp(escapeRe(title))];
    if (bare !== title) needles.push(new RegExp(escapeRe(bare)));
    rules.push({
      id: `post:${slug}`,
      derived: true,
      target: new RegExp(`^(?:https?://(?:www\\.)?scottclark\\.io)?/blog/${escapeRe(slug)}/?(?:[#?].*)?$`),
      selfPath: `/blog/${slug}`,
      needles,
      title,
    });
  }
  return rules;
}

if (!existsSync(DIST)) {
  console.error("check-crosslinks: no dist/ — run the build first");
  process.exit(2);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
const postRules = postRulesFromDist(htmlFiles);
const allRules = [...RULES, ...postRules];
const excludeUsed = new Set();

for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  if (rel === "404.html") continue;
  const html = readFileSync(file, "utf8");
  // Redirect stubs have no content of their own (same scope rule as aio-check).
  const headEnd = html.indexOf("</head>");
  const stubScope = headEnd > -1 ? html.slice(0, headEnd) : html.slice(0, 1000);
  if (stubScope.includes('<meta http-equiv="refresh"')) continue;

  const region = mainRegion(html);
  const text = norm(visibleText(region));
  const anchors = [...region.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: m[1].match(/href="([^"]*)"/)?.[1] ?? "",
    text: norm(visibleText(m[2])),
  }));
  // This page's own site-relative path ("blog/x/index.html" -> "/blog/x").
  const pagePath = "/" + rel.replace(/index\.html$/, "").replace(/\/$/, "").replace(/^\//, "");

  const exemption = (ruleId) => {
    const ex = EXCLUDE.find((e) => e.rule === ruleId && e.path.test(rel));
    if (ex) {
      excludeUsed.add(ex);
      notes.push(`KNOWN-EXEMPT ${rel} [${ruleId}]: ${ex.why}`);
    }
    return Boolean(ex);
  };

  // Class 1: bare paths in prose — every occurrence on the page, so one
  // run names the whole fix.
  const prose = norm(visibleText(proseRegion(region)));
  const bares = [...prose.matchAll(BARE_PATH)];
  if (bares.length && !exemption("bare-path")) {
    for (const bare of bares) {
      const i = (bare.index ?? 0) + bare[0].indexOf(bare[1]);
      const snippet = prose.slice(Math.max(0, i - 40), i + bare[1].length + 40).trim();
      failures.push(
        `${rel}: site path "${bare[1]}" appears as prose ("…${snippet}…") — a path is never link text; link the target by its title`,
      );
    }
  }

  // Class 0 (properties) + class 2 (derived post titles): same semantics.
  for (const rule of allRules) {
    if (rule.selfPath && pagePath === rule.selfPath) continue;
    const hit = rule.needles.map((n) => n.exec(text)).find(Boolean);
    if (!hit) continue;
    if (exemption(rule.id)) continue;
    const linked = anchors.some(
      (a) => rule.target.test(a.href) && rule.needles.some((n) => n.test(a.text)),
    );
    if (!linked) {
      const i = hit.index ?? 0;
      const snippet = text.slice(Math.max(0, i - 40), i + hit[0].length + 40).trim();
      const what = rule.derived ? `the post "${rule.title}" (${rule.selfPath})` : rule.id;
      failures.push(
        `${rel}: mentions ${what} ("…${snippet}…") but no <a> to ${rule.target} carries the phrase — link the mention`,
      );
    }
  }
}

// A dead exclude is a stale declaration — exemptions must die loudly.
for (const e of EXCLUDE)
  if (!excludeUsed.has(e))
    failures.push(
      `stale EXCLUDE [${e.rule} @ ${e.path}]: it no longer suppresses anything — remove it`,
    );

for (const n of notes) console.log("  " + n);
if (failures.length) {
  console.error(`\ncheck-crosslinks: ${failures.length} FAILURE(S)`);
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log(
  `check-crosslinks: OK — ${htmlFiles.length} pages, ${RULES.length} property rules + ${postRules.length} derived post rules + bare-path, every named property/post is linked`,
);
