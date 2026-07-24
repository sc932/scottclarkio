#!/usr/bin/env node
// Cross-link gate v1 — asserts the estate's cross-property + related-post
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
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// ---- per-repo config ----
// Sibling properties this site must link when it names them. Intra-site
// post rules arrive with the Phase-2 blog; "Scott Clark" is this property.
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
];
// Deliberate opt-outs: { path: <regex>, rule: <id>, why: <reason> }. Logged
// as KNOWN-EXEMPT notes; an exclude that stops suppressing anything fails.
const EXCLUDE = [
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

// Content region = <main>; chrome (nav/footer) stays out of scope so a
// site-wide footer mention can't trip (or satisfy) a per-page rule.
const mainRegion = (html) => {
  const m = html.match(/<main\b[\s\S]*?<\/main>/i);
  return m ? m[0] : (html.match(/<body\b[\s\S]*?<\/body>/i)?.[0] ?? html);
};

if (!existsSync(DIST)) {
  console.error("check-crosslinks: no dist/ — run the build first");
  process.exit(2);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
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
  const text = visibleText(region);
  const anchors = [...region.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: m[1].match(/href="([^"]*)"/)?.[1] ?? "",
    text: visibleText(m[2]),
  }));
  // This page's own site-relative path ("blog/x/index.html" -> "/blog/x").
  const pagePath = "/" + rel.replace(/index\.html$/, "").replace(/\/$/, "").replace(/^\//, "");

  for (const rule of RULES) {
    if (rule.selfPath && pagePath === rule.selfPath) continue;
    const hit = rule.needles.map((n) => n.exec(text)).find(Boolean);
    if (!hit) continue;
    const ex = EXCLUDE.find(
      (e) => e.rule === rule.id && e.path.test(rel),
    );
    if (ex) {
      excludeUsed.add(ex);
      notes.push(`KNOWN-EXEMPT ${rel} [${rule.id}]: ${ex.why}`);
      continue;
    }
    const linked = anchors.some(
      (a) => rule.target.test(a.href) && rule.needles.some((n) => n.test(a.text)),
    );
    if (!linked) {
      const i = hit.index ?? 0;
      const snippet = text.slice(Math.max(0, i - 40), i + hit[0].length + 40).trim();
      failures.push(
        `${rel}: mentions ${rule.id} ("…${snippet}…") but no <a> to ${rule.target} carries the phrase — link the mention`,
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
  `check-crosslinks: OK — ${htmlFiles.length} pages, ${RULES.length} rules, every named property/post is linked`,
);
