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
// needle of the SAME rule — the brand/title PHRASE must be a link at least
// once on that page, never only plain text. "A link to the host exists
// elsewhere" does not pass: the pivot post linked talariasci.com three times
// while "Talaria Scientific" stayed plain text (the founding incident of this
// gate). Pages whose own path IS a relative target are exempt (a post never
// links itself); EXCLUDE carries deliberate opt-outs, each WITH a reason,
// and a stale exclude (one that no longer suppresses anything) FAILS.
//
// v2 (2026-10-23, Scott: /talks named its recap posts by SLUG, as plain
// text — "the correct way to do this is to have the title of the post and
// have it actually link"). Two rule classes join the hand-written property
// rules:
//   1. bare-path (static, from PATH_ROOTS) — a site-internal path
//      (`/blog/<slug>`, `/talks`, `scottclark.io/…`) appearing as visible
//      PROSE fails outright, linked or not: a path is never link text; the
//      target's TITLE is. Prose = <main> minus <code>/<pre> (a how-I-built-
//      this post may quote a path as a path).
//   2. post:<slug> (DERIVED from dist/) — one rule per published post page,
//      from its JSON-LD BlogPosting headline (the identity the AIO gate
//      pins): a page that names the post by title (any case) must link it by
//      that title; a recap's headline minus its "(… recap)" qualifier is the
//      talk's own title, so the needle carries both forms and /talks must
//      link each recap; the post's hyphenated slug as prose fails too (a slug
//      is never prose). The post's own page is exempt.
// Read-next cards (a <section> whose class tokens include `related`) are
// navigation chrome, not body citations: out of scope for mentions AND
// anchors (estate rule 2026-08-28). The text model mirrors a browser's:
// inline tags vanish ("<em>AI</em>:" reads "AI:"), block tags and
// super/subscripts are word boundaries, entities decode, soft hyphens
// vanish, curly quotes fold to ASCII for matching.
// A SELF-TEST of the matcher + page semantics runs before every dist walk
// (round-1 ruling, 2026-10-23: this regex gates every deploy, so its pins
// live here, not in a review record), and scripts/check-crosslinks.mutants.mjs
// proves each pin can FAIL (round-2 ruling: a self-test that cannot fail is
// no receipt).
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// ---- per-repo config ----
// This property's host — the ONE owner of the pattern (the bare-path class
// and the derived post targets both build from it).
const OWN_HOST = "(?:www\\.)?scottclark\\.io";
// Site-internal path roots that are never prose (a hand list: a new top-level
// route joins it here; the AIO gate's route set is the place to cross-check).
// `/slides/…` and `/resume/…` are downloads whose anchor text is "Slides" /
// "Download the slides" / "CV (PDF)", never a reference.
const PATH_ROOTS = "blog|talks|press|projects|publications|cv|figures|slides|resume|images|about";
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
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&shy;/g, "­")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Inline elements vanish from the text model (a browser renders "<em>AI</em>:"
// as "AI:"); everything else is a word boundary. NOT here, deliberately:
// `span` — this site stacks block-styled spans (the talk row's title/event)
// with no whitespace between them, and TitleParts separates its spans with a
// text node; `sup`/`sub` — a footnote marker ("/talks<sup>1</sup>.") must not
// fuse with the word before it.
const INLINE_TAGS = "a|abbr|b|cite|code|em|i|kbd|mark|q|s|small|strong|time|u|var";
const INLINE_TAG_RE = new RegExp(`</?(?:${INLINE_TAGS})\\b[^>]*>`, "gi");

// Visible text of an HTML region: scripts/styles/SVG out, inline tags gone,
// other tags to spaces, entities decoded, soft hyphens removed, whitespace
// collapsed.
const visibleText = (s) =>
  decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(INLINE_TAG_RE, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/­/g, "")
    .replace(/\s+/g, " ");

// Typographic quotes → ASCII so a title with a curly apostrophe matches its
// straight-quoted mention (and vice versa); soft hyphens out on BOTH sides
// (a headline may carry one raw). Applied to needle sources and to the text
// they are tested against — never to the HTML itself.
const norm = (s) =>
  s.replace(/­/g, "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Content region = <main>; chrome (nav/footer) stays out of scope so a
// site-wide footer mention can't trip (or satisfy) a per-page rule. Read-next
// cards are chrome too: a <section> whose class attribute (either quote
// style) has the exact token `related` — not `related-work`.
const classTokens = (attrs) =>
  (attrs.match(/\bclass=(["'])(.*?)\1/i)?.[2] ?? "").trim().split(/\s+/);
const isRelated = (attrs) => classTokens(attrs).includes("related");
const stripRelated = (region) =>
  region.replace(/<section\b([^>]*)>[\s\S]*?<\/section>/gi, (whole, attrs) => (isRelated(attrs) ? " " : whole));
const mainRegion = (html) => {
  const m = html.match(/<main\b[\s\S]*?<\/main>/i);
  const region = m ? m[0] : (html.match(/<body\b[\s\S]*?<\/body>/i)?.[0] ?? html);
  return stripRelated(region);
};

// Prose region for the bare-path and slug classes: code samples may quote a
// path or a slug.
const proseRegion = (region) =>
  region
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code\b[\s\S]*?<\/code>/gi, " ");

// A site path as prose: optional own-host prefix (with or without a scheme —
// "scottclark.io/talks" is the same defect as "/talks"), a known root with an
// optional extension (`/figures.json`), optional segments (a dot only INSIDE
// a segment, so a sentence-ending period stays out of the capture), bounded
// by whitespace/punctuation on both sides so an unrelated token ("A/B",
// "argmax f(x)", a path on another host) cannot match. `#`, the dashes, the
// ellipsis and sentence punctuation are boundaries on both sides
// (`/blog/x#slides`, `then—/talks`, `Recap:/blog/x`, `/blog/a,/blog/b`); the
// leading boundary is a lookbehind so two adjacent paths both match.
const SEG = "[A-Za-z0-9_~-]+(?:\\.[A-Za-z0-9_~-]+)*";
const BOUND = "\\s()\\[\\]\"'“”‘’#—–….,;:!?";
const BARE_PATH = new RegExp(
  `(?<=^|[${BOUND}])((?:(?:https?://)?${OWN_HOST})?/(?:${PATH_ROOTS})(?:\\.[A-Za-z0-9]+)?(?:/${SEG})*/?)(?=$|[${BOUND}])`,
  "gi",
);

const titleNeedle = (phrase) =>
  new RegExp(`(?<![A-Za-z0-9])${escapeRe(phrase)}(?![A-Za-z0-9])`, "i");

// Build one derived rule for a published post. The self-test builds its own
// from probe headlines; the dist walk feeds it real ones.
function postRule(slug, headline) {
  const title = norm(headline);
  const bare = title.replace(/\s*\([^()]*\brecap\)$/i, "");
  const needles = [titleNeedle(title)];
  if (bare !== title) needles.push(titleNeedle(bare));
  return {
    id: `post:${slug}`,
    derived: true,
    title,
    selfPath: `/blog/${slug}`,
    // The href must match the emitted route byte-for-byte in its path (S3
    // is case-sensitive: "/Blog/x" 404s), any scheme/host form the site emits.
    target: new RegExp(`^(?:https?://${OWN_HOST})?/blog/${escapeRe(slug)}/?(?:[#?].*)?$`),
    needles,
    // The slug as prose ("the better-evals-abundance post"): hyphenated slugs
    // only — a one-word slug is an ordinary word. Glued to URL punctuation
    // (`/slug`, `?p=slug`, `#slug`, `slug.pdf`) the token is part of a URL —
    // the bare-path class reports an own-site one; another host's is not ours.
    slugNeedle: slug.includes("-")
      ? new RegExp(`(?<![A-Za-z0-9/._=#?&-])${escapeRe(slug)}(?![A-Za-z0-9._-])`, "i")
      : null,
  };
}

// One rule per published post page: needles = the BlogPosting headline (the
// AIO gate pins headline == frontmatter title) and, for recaps, the headline
// without its trailing "(… recap)" qualifier — the talk's own title.
// SiteLayout emits ONE ld+json block (an @graph) per page; were there several,
// the last BlogPosting headline would win.
function postRulesFromDist(htmlFiles, failures) {
  const rules = [];
  for (const file of htmlFiles) {
    const m = file.match(/^dist\/blog\/([^/]+)\/index\.html$/);
    if (!m) continue;
    const slug = m[1];
    const html = readFileSync(file, "utf8");
    let headline = null;
    let broken = false;
    for (const s of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let data;
      try {
        data = JSON.parse(s[1]);
      } catch {
        broken = true;
        failures.push(`blog/${slug}/index.html: unparseable JSON-LD — the post-title rule cannot be derived`);
        continue;
      }
      const nodes = Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
      const post = nodes.find((n) => n?.["@type"] === "BlogPosting" && typeof n.headline === "string");
      if (post) headline = post.headline;
    }
    if (!headline) {
      if (!broken) failures.push(`blog/${slug}/index.html: no BlogPosting headline in JSON-LD — the post-title rule cannot be derived`);
      continue;
    }
    rules.push(postRule(slug, headline));
  }
  return rules;
}

// Check ONE rendered page. Pure: returns its failures, the KNOWN-EXEMPT notes
// it logged, and the EXCLUDE rows it actually used (a row is "used" only when
// it suppressed a failure — a row on a page that mentions AND links correctly
// is stale and must die loudly).
function checkPage({ rel, html, rules, exclude }) {
  const failures = [];
  const notes = [];
  const used = new Set();
  const region = mainRegion(html);
  const text = norm(visibleText(region));
  const prose = norm(visibleText(proseRegion(region)));
  const anchors = [...region.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: m[1].match(/(?<![\w-])href=(["'])(.*?)\1/)?.[2] ?? "",
    text: norm(visibleText(m[2])),
  }));
  // This page's own site-relative path ("blog/x/index.html" -> "/blog/x").
  const pagePath = "/" + rel.replace(/(^|\/)index\.html$/, "$1").replace(/\/$/, "").replace(/^\//, "");
  const exemption = (ruleId) => {
    const ex = exclude.find((e) => e.rule === ruleId && e.path.test(rel));
    if (ex) {
      used.add(ex);
      const note = `KNOWN-EXEMPT ${rel} [${ruleId}]: ${ex.why}`;
      if (!notes.includes(note)) notes.push(note);
    }
    return Boolean(ex);
  };
  const snippetOf = (s, i, len) => s.slice(Math.max(0, i - 40), i + len + 40).trim();

  // Class 1: bare paths in prose — every occurrence on the page, so one run
  // names the whole fix.
  const bares = [...prose.matchAll(BARE_PATH)];
  if (bares.length && !exemption("bare-path")) {
    for (const bare of bares) {
      const i = (bare.index ?? 0) + bare[0].indexOf(bare[1]);
      failures.push(
        `${rel}: site path "${bare[1]}" appears as prose ("…${snippetOf(prose, i, bare[1].length)}…") — a path is never link text; link the target by its title`,
      );
    }
  }

  // Class 0 (properties, on the full text — v1 semantics) + class 2 (derived
  // post titles, on PROSE: a title inside a code sample is a quotation): the
  // same must-link semantics. Longest match wins among derived rules: a
  // headline that is a prefix of another's ("Accelerating Science with AI" vs
  // "Accelerating Science with AI: Surfing …") is owned by the longer title
  // wherever the longer one is the mention.
  const firstHit = (rule) => {
    const hay = rule.derived ? prose : text;
    return rule.needles.map((n) => n.exec(hay)).find(Boolean) ?? null;
  };
  const hits = new Map(rules.map((r) => [r, firstHit(r)]));
  const ownedByLonger = (rule, hit) =>
    rule.derived &&
    rules.some((o) => {
      const h = o !== rule && o.derived ? hits.get(o) : null;
      return h && h.index === hit.index && h[0].length > hit[0].length;
    });
  for (const rule of rules) {
    if (rule.selfPath && pagePath === rule.selfPath) continue;
    const hit = hits.get(rule);
    if (hit && !ownedByLonger(rule, hit)) {
      const linked = anchors.some(
        (a) => rule.target.test(a.href) && rule.needles.some((n) => n.test(a.text)),
      );
      if (!linked && !exemption(rule.id)) {
        const what = rule.derived ? `the post "${rule.title}" (${rule.selfPath})` : rule.id;
        const hay = rule.derived ? prose : text;
        failures.push(
          `${rel}: mentions ${what} ("…${snippetOf(hay, hit.index ?? 0, hit[0].length)}…") but no <a> to ${rule.target} carries the phrase — link the mention`,
        );
      }
    }
    // Class 2b: the post's slug as prose.
    if (rule.slugNeedle) {
      const s = rule.slugNeedle.exec(prose);
      if (s && !exemption(rule.id))
        failures.push(
          `${rel}: names the post "${rule.title}" by its slug ("…${snippetOf(prose, s.index ?? 0, s[0].length)}…") — a slug is never prose; link the title (${rule.selfPath})`,
        );
    }
  }
  return { failures, notes, used };
}

// The gate's own pins: the matcher and the page semantics, run before every
// dist walk. A failing self-test means the gate cannot be trusted: exit 3.
// Every case names the code path it pins; scripts/check-crosslinks.mutants.mjs
// breaks each path and expects this self-test to catch it (a case that stays
// green under its mutant is vacuous — round-2 BLOCKER class, 2026-10-23).
function selfTest() {
  const page = (body) => `<html><head><title>t</title></head><body><nav>/cv</nav><main>${body}</main><footer>/talks</footer></body></html>`;
  const probe = postRule("probe-post", "Probe Post: A Title (talk recap)");
  const curly = postRule("scotts-probe", "Scott’s Probe");
  const shy = postRule("shy-probe", "Soft­Hyphen Probe");
  const shorter = postRule("probe", "Probe Post"); // a prefix of probe's headline
  const rules = [...RULES, probe, curly, shy, shorter];
  const T = [];
  const t = (name, body, want, opts = {}) => T.push({ name, body, want, ...opts });
  // bare-path matcher
  t("bare path, sentence period out of the capture", "<p>walkthrough at /blog/better-evals-abundance.</p>", 1, { capture: "/blog/better-evals-abundance" });
  t("bare path with a fragment", "<p>see /blog/x#slides today</p>", 1, { capture: "/blog/x" });
  t("bare path with a query", "<p>see /blog/x?from=home today</p>", 1);
  t("bare path, trailing slash, in parens", "<p>(/blog/x/)</p>", 1, { capture: "/blog/x/" });
  t("bare path in quotes", "<p>\"/press\"</p>", 1, { capture: "/press" });
  t("bare path before an em dash", "<p>see /talks—then</p>", 1, { capture: "/talks" });
  t("bare path after an em dash", "<p>then—/talks now</p>", 1, { capture: "/talks" });
  t("bare path glued to a colon", "<p>Recap:/blog/x now</p>", 1, { capture: "/blog/x" });
  t("two paths split by a comma, two lines", "<p>/blog/a,/blog/b</p>", 2);
  t("a download route is a root", "<p>see /resume/scott-clark-resume.pdf</p>", 1, { capture: "/resume/scott-clark-resume.pdf" });
  t("scheme-less own host", "<p>see scottclark.io/talks, then</p>", 1, { capture: "scottclark.io/talks" });
  t("absolute own host", "<p>see https://www.scottclark.io/blog/x/ and</p>", 1, { capture: "https://www.scottclark.io/blog/x/" });
  t("dotted root file", "<p>see /figures.json</p>", 1, { capture: "/figures.json" });
  t("upper-case root", "<p>See /CV.</p>", 1, { capture: "/CV" });
  t("two paths, two lines", "<p>/blog/a and /blog/b.</p>", 2);
  t("path wrapped by em at a space (collapse-safe)", "<p>at <em>/talks</em> today</p>", 1, { capture: "/talks" });
  t("path split mid-token by em (inline tags vanish)", "<p>at /ta<em>lks</em> today</p>", 1, { capture: "/talks" });
  t("path followed by a footnote superscript", '<p>see /talks<sup><a href="#fn1">1</a></sup>.</p>', 1, { capture: "/talks" });
  t("path split by a soft hyphen entity", "<p>at /blog/better&shy;-evals today</p>", 1, { capture: "/blog/better-evals" });
  t("path in code", "<p>see <code>/blog/x</code></p>", 0);
  t("path in pre", "<pre>/talks</pre>", 0);
  t("other host", "<p>see https://talariasci.com/blog/x and talariasci.com/talks</p>", 0);
  t("no root token: fractions, A/B, dates (sanity)", "<p>A/B tests at 10/23/2026 and f(x)/g(x), 1/2</p>", 0);
  t("word-interior slash", "<p>a path/blog/x inside a word</p>", 0);
  t("bare host only", "<p>visit scottclark.io today</p>", 0);
  t("path in an attribute only", '<p><img alt="/talks" src="/images/x.png"></p>', 0);
  // post-title semantics
  t("stripped (talk-title) form unlinked", "<p>Read Probe Post: A Title now.</p>", 1, { expect: 'the post "Probe Post: A Title (talk recap)"' });
  t("full recap headline unlinked", "<p>Read Probe Post: A Title (talk recap) now.</p>", 1);
  t("title in lower case unlinked", "<p>read probe post: a title now.</p>", 1, { expect: 'the post "Probe Post: A Title (talk recap)"' });
  t("title wrapped by em at a space (collapse-safe)", "<p>Read Probe Post: <em>A</em> Title now.</p>", 1);
  t("title split mid-token by em (inline tags vanish)", "<p>Read Probe P<em>ost: A</em> Title now.</p>", 1, { expect: 'the post "Probe Post: A Title (talk recap)"' });
  t("title followed by a footnote superscript", '<p>Read Probe Post: A Title<sup><a href="#fn1">1</a></sup>.</p>', 1, { expect: 'the post "Probe Post: A Title (talk recap)"' });
  t("block-styled spans stay separate words (the talk row)", '<span class="row-org">Probe Post: A Title</span><span class="row-title">Event Name</span>', 1, { expect: 'the post "Probe Post: A Title (talk recap)"' });
  t("title linked by title", '<p>Read <a href="/blog/probe-post">Probe Post: A Title</a> now.</p>', 0);
  t("title linked by title, absolute + fragment", '<p>Read <a href="https://scottclark.io/blog/probe-post/#x">Probe Post: A Title</a>.</p>', 0);
  t("title linked by title, single-quoted href", "<p>Read <a href='/blog/probe-post'>Probe Post: A Title</a>.</p>", 0);
  t("title linked by other text", '<p>Read Probe Post: A Title <a href="/blog/probe-post">here</a>.</p>', 1);
  t("title linked to a prefix slug", '<p>Read <a href="/blog/probe-post-2">Probe Post: A Title</a>.</p>', 1);
  t("title linked to a wrong-case path", '<p>Read <a href="/Blog/probe-post">Probe Post: A Title</a>.</p>', 1);
  t("unlinked title in a read-next card is chrome", '<p>x</p><section class="related extra" data-astro-cid-x><p>Probe Post: A Title</p></section>', 0);
  t("unlinked title in a single-quoted read-next card is chrome", "<p>x</p><section class='related'><p>Probe Post: A Title</p></section>", 0);
  t("a read-next card's anchor does not link a body mention", '<p>Read Probe Post: A Title now.</p><section class="related"><a href="/blog/probe-post">Probe Post: A Title</a></section>', 1);
  t("related-work is not a read-next card", '<section class="related-work"><p>see /talks.</p></section>', 1, { capture: "/talks" });
  t("title glued to a preceding letter is no mention (leading guard)", "<p>XProbe Post: A Title</p>", 0);
  t("title glued to a following letter is no mention (trailing guard)", "<p>Read Scott's Probes now.</p>", 0);
  t("title in a code sample is a quotation", "<p>the <code>Probe Post: A Title</code> string</p>", 0);
  t("a shorter headline inside the longer title's linked mention is owned by the longer", '<p>Read <a href="/blog/probe-post">Probe Post: A Title</a>.</p>', 0);
  t("the shorter headline on its own still fires", "<p>Read Probe Post now.</p>", 1, { expect: 'the post "Probe Post" (/blog/probe)' });
  t("curly-apostrophe title, straight-quoted mention", "<p>Read Scott's Probe now.</p>", 1);
  t("curly-apostrophe title, &apos; mention", "<p>Read Scott&apos;s Probe now.</p>", 1);
  t("curly-apostrophe title, linked with &#8217;", '<p>Read <a href="/blog/scotts-probe">Scott&#8217;s Probe</a>.</p>', 0);
  t("soft hyphen in the headline, none in the mention", "<p>Read SoftHyphen Probe now.</p>", 1);
  t("slug as prose", "<p>the probe-post post</p>", 1);
  t("slug inside a bare path counts once", "<p>see /blog/probe-post today</p>", 1);
  t("slug in code", "<p>the <code>probe-post</code> file</p>", 0);
  t("slug glued to URL punctuation is not prose", "<p>see example.org/?p=probe-post and #probe-post and probe-post.pdf</p>", 0);
  t("self page exempt", "<h1>Probe Post: A Title</h1><p>probe-post</p>", 0, { rel: "blog/probe-post/index.html" });
  t("sub-page is not the self page", "<h1>Probe Post: A Title</h1>", 1, { rel: "blog/probe-post/extra/index.html" });
  t("fooindex.html is not the self page", "<h1>Probe Post: A Title</h1>", 1, { rel: "blog/probe-postindex.html" });
  t("property mention unlinked", "<p>Talaria is great</p>", 1);
  t("property mention linked", '<p><a href="https://talariasci.com">Talaria</a> is great</p>', 0);
  // EXCLUDE semantics
  t("exclude suppresses the title failure", "<p>Read Probe Post: A Title now.</p>", 0, {
    exclude: [{ path: /^probe\/index\.html$/, rule: "post:probe-post", why: "t" }],
    usedCount: 1,
  });
  t("exclude on a page that links correctly is unused (stale)", '<p>Read <a href="/blog/probe-post">Probe Post: A Title</a>.</p>', 0, {
    exclude: [{ path: /^probe\/index\.html$/, rule: "post:probe-post", why: "t" }],
    usedCount: 0,
  });
  t("bare-path exclude suppresses", "<p>see /talks.</p>", 0, {
    exclude: [{ path: /^probe\/index\.html$/, rule: "bare-path", why: "t" }],
    usedCount: 1,
  });

  const bad = [];
  for (const c of T) {
    const r = checkPage({ rel: c.rel ?? "probe/index.html", html: page(c.body), rules, exclude: c.exclude ?? [] });
    const got = r.failures.length;
    let ok = got === c.want;
    if (ok && c.capture !== undefined) ok = r.failures.some((f) => f.includes(`site path "${c.capture}"`));
    if (ok && c.expect !== undefined) ok = r.failures.some((f) => f.includes(c.expect));
    if (ok && c.usedCount !== undefined) ok = r.used.size === c.usedCount;
    if (!ok) bad.push(`  ${c.name}: want ${c.want}${c.capture ? ` capture "${c.capture}"` : ""}${c.expect ? ` naming ${c.expect}` : ""}${c.usedCount !== undefined ? ` used ${c.usedCount}` : ""}, got ${got}${r.failures.length ? "\n    " + r.failures.join("\n    ") : ""}`);
  }
  if (bad.length) {
    console.error(`check-crosslinks: SELF-TEST FAILED (${bad.length}/${T.length}) — the gate cannot be trusted:\n${bad.join("\n")}`);
    process.exit(3);
  }
  return T.length;
}

const selfTests = selfTest();

if (!existsSync(DIST)) {
  console.error("check-crosslinks: no dist/ — run the build first");
  process.exit(2);
}

const failures = [];
const notes = [];
const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
const postRules = postRulesFromDist(htmlFiles, failures);
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
  const r = checkPage({ rel, html, rules: allRules, exclude: EXCLUDE });
  failures.push(...r.failures);
  notes.push(...r.notes);
  for (const e of r.used) excludeUsed.add(e);
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
  `check-crosslinks: OK — ${htmlFiles.length} pages, ${RULES.length} property rules + ${postRules.length} derived post rules + bare-path (${selfTests} self-tests green), every named property/post is linked`,
);
