#!/usr/bin/env node
// check-structured-data.mjs — the JSON-LD gate over dist/ (2026-11-02).
// Search Console mailed two "structured data issues" for talariasci.com on
// 2026-10-28 that no gate could see: the press kit's ProfilePage carried
// dateCreated/dateModified as calendar dates where Google's type is DateTime
// ("Invalid datetime value"), and its ImageObjects named no creator ("Missing
// field creator"). This gate turns the classes behind both into CHECKED
// invariants over every page's JSON-LD, so a regression fails the deploy
// instead of arriving as a notice weeks later. Estate-wide: the same file
// (per-repo config block only) runs in talaria-site, scottclarkio and
// tauopt-site; the self-test below runs before every scan, and
// scripts/check-structured-data.mutants.mjs proves each self-test can fail.
//
// Rules:
//  D1 every date-valued property (date*, *Date, validFrom/validThrough,
//     expires, lastReviewed) is a valid ISO 8601 date or date-time:
//     YYYY | YYYY-MM | YYYY-MM-DD | YYYY-MM-DDThh:mm[:ss[.s]](Z|+hh:mm|-hh:mm),
//     on a real calendar day
//  D2 Google's DateTime-typed fields carry the FULL form (a time AND a zone):
//     ProfilePage.dateCreated/dateModified, VideoObject.uploadDate, and the
//     datePublished/dateModified of a page's own TOP-LEVEL Article-family node
//     (a nested list item — a bibliography's ScholarlyArticle — may be a date
//     or a year; Google reads rich results from the page's own node)
//  I1 every ImageObject carries contentUrl, an absolute http(s) URL; an
//     on-site URL must be a file dist/ built
//  I2 every ImageObject names its creator: a Person or Organization NODE with
//     a name (a bare {"@id"} reference is not a creator Google can read)
//  I3 every ImageObject carries at least one of creditText / copyrightNotice /
//     license, and a license comes with its acquireLicensePage (Google's pair)
//  R1 a bare {"@id"} reference resolves: on the SAME page for the properties
//     a rich result reads (mainEntity, creator, author, publisher); elsewhere,
//     on any page of this site or in the estate's cross-domain identity set
//  R2 one @id, one @type per page (two nodes sharing an @id with different
//     types merge into nonsense)
//  P1 a ProfilePage has a mainEntity that resolves to a named Person or
//     Organization
// Exit: 0 ok · 1 failures · 2 no dist/ · 3 self-test failed.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// ---- per-repo config ----
const SITE_URL = "https://scottclark.io";
// The estate's cross-domain identities: ONE Person and ONE Organization per
// entity, defined on their home site and referenced from the others.
const ESTATE_IDS = new Set([
  "https://scottclark.io/#person",
  "https://talariasci.com/#organization",
  "https://distributional.com/#organization",
]);
// -------------------------

const DIST = "dist";

const ARTICLE_TYPES = new Set([
  "Article",
  "NewsArticle",
  "BlogPosting",
  "ScholarlyArticle",
  "TechArticle",
  "Report",
  "SocialMediaPosting",
  "LiveBlogPosting",
]);
// (type, property) pairs Google documents as DateTime (the full form).
const DATETIME_FIELDS = new Set(["ProfilePage.dateCreated", "ProfilePage.dateModified", "VideoObject.uploadDate"]);
const DATE_PROPS_EXTRA = new Set(["validFrom", "validThrough", "expires", "lastReviewed"]);
const SAME_PAGE_PROPS = new Set(["mainEntity", "creator", "author", "publisher"]);
const CREATOR_TYPES = new Set(["Person", "Organization"]);
const CREDIT_PROPS = ["creditText", "copyrightNotice", "license"];

export const ISO_DATE = /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
export const ISO_DATETIME =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

/** The calendar day of an ISO value exists (2026-02-30 does not). */
export function calendarOk(value) {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return true; // year or year-month: nothing to check
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const isDateProp = (k) => /^date[A-Z]/.test(k) || /[a-z]Date$/.test(k) || DATE_PROPS_EXTRA.has(k);
const typeOf = (n) => (typeof n["@type"] === "string" ? n["@type"] : Array.isArray(n["@type"]) ? String(n["@type"][0]) : null);
const isRef = (n) => !!n && typeof n === "object" && !Array.isArray(n) && Object.keys(n).length === 1 && typeof n["@id"] === "string";
const isNode = (n) => !!n && typeof n === "object" && !Array.isArray(n);

/** Every <script type="application/ld+json"> block of a page, parsed. */
export function parseLdBlocks(html) {
  const blocks = [];
  const errors = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (!isNode(j) || !(Array.isArray(j["@graph"]) || j["@type"])) errors.push("JSON-LD block is neither a @graph nor a typed node");
      else blocks.push(j);
    } catch (e) {
      errors.push(`unparseable JSON-LD: ${e.message}`);
    }
  }
  return { blocks, errors };
}

/** Flatten a block into visited nodes: {node, path, top, parentType, prop}. */
function collect(block, rel, index) {
  const out = [];
  const visit = (v, path, top, parentType, prop) => {
    if (Array.isArray(v)) {
      v.forEach((x, i) => visit(x, `${path}[${i}]`, top, parentType, prop));
      return;
    }
    if (!isNode(v)) return;
    out.push({ node: v, path, top, parentType, prop });
    const t = typeOf(v) ?? parentType;
    for (const [k, val] of Object.entries(v)) if (!k.startsWith("@")) visit(val, `${path}.${k}`, false, t, k);
  };
  const roots = Array.isArray(block["@graph"]) ? block["@graph"] : [block];
  roots.forEach((n, i) => visit(n, `${rel} block ${index} @graph[${i}]`, true, null, null));
  return out;
}

/**
 * The rules over a set of pages. `pages` = [{ rel, blocks }] (parsed blocks,
 * see parseLdBlocks); `fileExists(pathname)` answers for on-site URLs.
 * Returns the failure strings (empty = GREEN). Pure, so the self-test and the
 * mutants can drive it with fixtures.
 */
export function checkPages(pages, { siteUrl, estateIds, fileExists }) {
  const failures = [];
  const perPage = [];
  const globalDefs = new Set();
  for (const page of pages) {
    const nodes = page.blocks.flatMap((b, i) => collect(b, page.rel, i));
    const defs = new Map(); // @id -> { types: Set, node }
    for (const { node } of nodes) {
      const id = node["@id"];
      const t = typeOf(node);
      if (typeof id !== "string" || !t) continue;
      if (!defs.has(id)) defs.set(id, { types: new Set(), node });
      defs.get(id).types.add(t);
      if (!defs.get(id).node.name && node.name) defs.get(id).node = node;
      globalDefs.add(id);
    }
    perPage.push({ page, nodes, defs });
  }
  for (const { page, nodes, defs } of perPage) {
    const rel = page.rel;
    // R2: one @id, one @type per page.
    for (const [id, { types }] of defs)
      if (types.size > 1) failures.push(`${rel}: @id ${id} is defined with different types on one page: ${[...types].join(", ")}`);
    for (const { node, path, top, parentType, prop } of nodes) {
      const type = typeOf(node);
      // R1: bare references resolve (a creator reference is I2's finding).
      if (isRef(node)) {
        if (parentType === "ImageObject" && prop === "creator") continue;
        const id = node["@id"];
        const resolved = defs.has(id) || globalDefs.has(id) || estateIds.has(id);
        if (!resolved) failures.push(`${path}: dangling reference — nothing defines @id ${id} (on this page, this site, or the estate set)`);
        else if (SAME_PAGE_PROPS.has(prop) && !defs.has(id))
          failures.push(`${path}: the ${prop} reference ${id} must resolve on the same page — a rich result reads it there`);
        continue;
      }
      // D1 / D2: dates.
      for (const [k, v] of Object.entries(node)) {
        if (!isDateProp(k)) continue;
        for (const value of Array.isArray(v) ? v : [v]) {
          if (typeof value !== "string") {
            failures.push(`${path}.${k}: date value is not a string (${JSON.stringify(value)})`);
            continue;
          }
          if (!(ISO_DATE.test(value) || ISO_DATETIME.test(value))) {
            failures.push(`${path}.${k}: "${value}" is not a valid ISO 8601 date or date-time`);
            continue;
          }
          if (!calendarOk(value)) {
            failures.push(`${path}.${k}: "${value}" is not a real calendar day`);
            continue;
          }
          const full = DATETIME_FIELDS.has(`${type}.${k}`) || (top && ARTICLE_TYPES.has(type) && (k === "datePublished" || k === "dateModified"));
          if (full && !ISO_DATETIME.test(value))
            failures.push(`${path}.${k}: "${value}" must be a full ISO 8601 date-time with a time zone (Google types ${type}.${k} as DateTime)`);
        }
      }
      // I1-I3: ImageObjects.
      if (type === "ImageObject") {
        const contentUrl = node.contentUrl;
        if (typeof contentUrl !== "string" || !contentUrl) failures.push(`${path}: ImageObject has no contentUrl`);
        else if (!/^https?:\/\//.test(contentUrl)) failures.push(`${path}: ImageObject contentUrl "${contentUrl}" is not an absolute http(s) URL`);
        else if (contentUrl.startsWith(`${siteUrl}/`)) {
          const pathname = decodeURIComponent(new URL(contentUrl).pathname);
          if (!fileExists(pathname)) failures.push(`${path}: ImageObject contentUrl ${contentUrl} is not a file dist/ built`);
        }
        const creator = node.creator;
        if (!creator) failures.push(`${path}: ImageObject names no creator (Google's image-metadata field)`);
        else if (isRef(creator)) failures.push(`${path}: ImageObject creator is a bare @id reference — carry the Person/Organization type and name on the node`);
        else if (!isNode(creator) || !CREATOR_TYPES.has(typeOf(creator)))
          failures.push(`${path}: ImageObject creator must be a Person or Organization node (got ${String(JSON.stringify(creator)).slice(0, 80)})`);
        else if (typeof creator.name !== "string" || !creator.name.trim()) failures.push(`${path}: ImageObject creator has no name`);
        if (!CREDIT_PROPS.some((p) => typeof node[p] === "string" && node[p].trim()))
          failures.push(`${path}: ImageObject carries none of creditText / copyrightNotice / license`);
        if (node.license && !node.acquireLicensePage) failures.push(`${path}: ImageObject has a license but no acquireLicensePage (Google reads the pair)`);
      }
      // P1: ProfilePage.mainEntity.
      if (type === "ProfilePage") {
        const me = node.mainEntity;
        if (!me) failures.push(`${path}: ProfilePage has no mainEntity`);
        else {
          const target = isRef(me) ? defs.get(me["@id"])?.node : isNode(me) ? me : null;
          if (!target || !CREATOR_TYPES.has(typeOf(target)) || typeof target.name !== "string" || !target.name.trim())
            failures.push(`${path}: ProfilePage.mainEntity does not resolve (on this page) to a named Person or Organization`);
        }
      }
    }
  }
  return failures;
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

/** An on-site URL path is served by dist/ (a file, or a directory's index.html). */
export function distHas(pathname, dist = DIST) {
  const p = join(dist, pathname.replace(/^\//, ""));
  if (existsSync(p) && statSync(p).isFile()) return true;
  return existsSync(join(p, "index.html"));
}

// ---- self-test: every rule proven RED on its defect and GREEN on the fix ----
// The fixture mirrors the estate graph (Organization + WebSite + a ProfilePage
// whose Person carries a complete ImageObject). Each case mutates ONE thing.
export function selfTest() {
  const site = "https://example.test";
  const estate = new Set([`${site}/#estate-person`]);
  const fileExists = (p) => p.startsWith("/ok/");
  const org = () => ({ "@type": "Organization", "@id": `${site}/#organization`, name: "Example", url: site });
  const web = () => ({ "@type": "WebSite", "@id": `${site}/#website`, url: `${site}/`, publisher: { "@id": `${site}/#organization` } });
  const img = () => ({
    "@type": "ImageObject",
    "@id": `${site}/ok/a.jpg#image`,
    contentUrl: `${site}/ok/a.jpg`,
    creator: { "@type": "Organization", "@id": `${site}/#organization`, name: "Example" },
    creditText: "Example",
    license: `${site}/ok/terms`,
    acquireLicensePage: `${site}/ok/terms`,
  });
  const person = () => ({ "@type": "Person", "@id": `${site}/#person`, name: "Someone", image: img() });
  const profile = () => ({
    "@type": "ProfilePage",
    "@id": `${site}/p#page`,
    mainEntity: { "@id": `${site}/#person` },
    dateCreated: "2026-09-14T00:00:00.000Z",
    dateModified: "2026-09-14T12:34:00-05:00",
  });
  const page = (rel, ...nodes) => ({ rel, blocks: [{ "@context": "https://schema.org", "@graph": nodes }] });
  const run = (...pages) => checkPages(pages, { siteUrl: site, estateIds: estate, fileExists });
  const problems = [];
  const expectRed = (name, failures, re) => {
    if (!failures.some((f) => re.test(f))) problems.push(`${name}: expected a failure matching ${re}, got [${failures.join(" | ")}]`);
  };
  const expectGreen = (name, failures) => {
    if (failures.length) problems.push(`${name}: expected GREEN, got [${failures.join(" | ")}]`);
  };
  const base = () => [org(), web(), person(), profile()];
  expectGreen("clean estate graph", run(page("p/index.html", ...base())));
  // D2 — the two Search Console classes of 2026-10-28, verbatim shapes.
  expectRed("ProfilePage dateCreated as a calendar date", run(page("p", org(), web(), person(), { ...profile(), dateCreated: "2026-09-14" })), /dateCreated: "2026-09-14" must be a full ISO 8601 date-time/);
  expectRed("ProfilePage dateModified as a calendar date", run(page("p", org(), web(), person(), { ...profile(), dateModified: "2026-09-14" })), /dateModified: "2026-09-14" must be a full/);
  // D1
  expectRed("a prose date", run(page("p", org(), web(), person(), { ...profile(), dateModified: "Sept 14, 2026" })), /not a valid ISO 8601/);
  expectRed("an impossible calendar day", run(page("p", org(), web(), person(), { ...profile(), dateModified: "2026-02-30T00:00:00Z" })), /not a real calendar day/);
  expectRed("a zone-less date-time", run(page("p", org(), web(), person(), { ...profile(), dateModified: "2026-09-14T00:00:00" })), /not a valid ISO 8601/);
  expectRed("a non-string date", run(page("p", org(), web(), person(), { ...profile(), dateModified: 2026 })), /date value is not a string/);
  const article = (extra) => ({ "@type": "BlogPosting", "@id": `${site}/b/x#article`, headline: "x", author: { "@id": `${site}/#person` }, publisher: { "@id": `${site}/#organization` }, datePublished: "2026-07-24T00:00:00.000Z", ...extra });
  expectRed("top-level BlogPosting datePublished as a date", run(page("b", ...base(), article({ datePublished: "2026-07-24" }))), /datePublished: "2026-07-24" must be a full/);
  expectGreen("top-level BlogPosting with full date-times", run(page("b", ...base(), article({ dateModified: "2026-07-25T00:00:00.000Z" }))));
  const list = (item) => ({ "@type": "CollectionPage", "@id": `${site}/l#page`, mainEntity: { "@type": "ItemList", itemListElement: [{ "@type": "ListItem", position: 1, item }] } });
  expectGreen("a nested list item's date-only datePublished", run(page("l", ...base(), list({ "@type": "ScholarlyArticle", headline: "y", datePublished: "2008" }))));
  expectGreen("a nested list item's calendar-date datePublished", run(page("l", ...base(), list({ "@type": "NewsArticle", headline: "y", datePublished: "2011-09-01" }))));
  expectRed("a nested list item's prose date", run(page("l", ...base(), list({ "@type": "NewsArticle", headline: "y", datePublished: "Fall 2011" }))), /not a valid ISO 8601/);
  expectRed("VideoObject uploadDate as a date", run(page("b", ...base(), article({ video: { "@type": "VideoObject", name: "v", uploadDate: "2026-07-24" } }))), /uploadDate: "2026-07-24" must be a full/);
  // I1-I3
  const withImg = (patch) => { const p = person(); p.image = { ...img(), ...patch }; return run(page("p", org(), web(), p, profile())); };
  expectRed("ImageObject without creator", withImg({ creator: undefined }), /names no creator/);
  expectRed("ImageObject creator as a bare reference", withImg({ creator: { "@id": `${site}/#organization` } }), /creator is a bare @id reference/);
  expectRed("ImageObject creator of the wrong type", withImg({ creator: { "@type": "Thing", name: "x" } }), /creator must be a Person or Organization/);
  expectRed("ImageObject creator without a name", withImg({ creator: { "@type": "Person", "@id": `${site}/#person` } }), /creator has no name/);
  expectRed("ImageObject without contentUrl", withImg({ contentUrl: undefined }), /has no contentUrl/);
  expectRed("ImageObject with a relative contentUrl", withImg({ contentUrl: "/ok/a.jpg" }), /not an absolute http/);
  expectRed("ImageObject whose on-site contentUrl did not build", withImg({ contentUrl: `${site}/missing/a.jpg` }), /not a file dist\/ built/);
  expectGreen("ImageObject with an off-site contentUrl", withImg({ contentUrl: "https://elsewhere.test/a.jpg" }));
  expectRed("ImageObject with no credit fields", withImg({ creditText: undefined, license: undefined, acquireLicensePage: undefined }), /none of creditText/);
  expectRed("ImageObject license without acquireLicensePage", withImg({ acquireLicensePage: undefined }), /no acquireLicensePage/);
  // R1 / R2
  expectRed("a dangling reference", run(page("p", ...base(), { "@type": "AboutPage", "@id": `${site}/a#page`, about: { "@id": `${site}/#nowhere` } })), /dangling reference/);
  expectRed("a publisher reference defined only on another page", run(page("a", org(), web(), person(), profile(), { "@type": "AboutPage", "@id": `${site}/a#page`, publisher: { "@id": `${site}/#elsewhere` } }), page("b", { "@type": "Organization", "@id": `${site}/#elsewhere`, name: "E" })), /publisher reference .* must resolve on the same page/);
  expectGreen("an isPartOf reference defined on another page", run(page("a", ...base(), { "@type": "AboutPage", "@id": `${site}/a#page`, isPartOf: { "@id": `${site}/b/x#article` } }), page("x", ...base(), article({}))));
  expectGreen("an estate identity reference", run(page("a", ...base(), { "@type": "AboutPage", "@id": `${site}/a#page`, about: { "@id": `${site}/#estate-person` } })));
  expectRed("one @id with two types", run(page("p", ...base(), { "@type": "Thing", "@id": `${site}/#organization`, name: "dup" })), /defined with different types/);
  // P1
  expectRed("ProfilePage without mainEntity", run(page("p", org(), web(), person(), { ...profile(), mainEntity: undefined })), /has no mainEntity/);
  expectRed("ProfilePage whose mainEntity has no name", run(page("p", org(), web(), { ...person(), name: undefined }, profile())), /does not resolve .* to a named Person/);
  expectGreen("ProfilePage with an inline mainEntity", run(page("p", org(), web(), { ...profile(), mainEntity: { "@type": "Person", name: "Inline" } })));
  // parse
  const bad = parseLdBlocks('<script type="application/ld+json">{bad</script>');
  if (bad.errors.length !== 1 || bad.blocks.length) problems.push(`parse: an unparseable block must be one error (got ${JSON.stringify(bad)})`);
  const typeless = parseLdBlocks('<script type="application/ld+json">{"name":"x"}</script>');
  if (typeless.errors.length !== 1) problems.push("parse: a block with neither @graph nor @type must be an error");
  const good = parseLdBlocks('<script type="application/ld+json">{"@context":"https://schema.org","@graph":[]}</script>');
  if (good.errors.length || good.blocks.length !== 1) problems.push("parse: a @graph block must parse");
  return problems;
}

function main() {
  const problems = selfTest();
  if (problems.length) {
    console.error(`check-structured-data: SELF-TEST FAILED (${problems.length})`);
    for (const p of problems) console.error(" - " + p);
    process.exit(3);
  }
  if (!existsSync(DIST)) {
    console.error("check-structured-data: no dist/ — run the build first (self-test green)");
    process.exit(2);
  }
  const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
  const failures = [];
  const pages = [];
  let skipped = 0;
  for (const f of htmlFiles) {
    const rel = f.slice(DIST.length + 1);
    const { blocks, errors } = parseLdBlocks(readFileSync(f, "utf8"));
    for (const e of errors) failures.push(`${rel}: ${e}`);
    if (!blocks.length) skipped++;
    pages.push({ rel, blocks });
  }
  failures.push(...checkPages(pages, { siteUrl: SITE_URL, estateIds: ESTATE_IDS, fileExists: (p) => distHas(p) }));
  const stats = { nodes: 0, images: 0, refs: 0 };
  for (const p of pages)
    for (const [i, b] of p.blocks.entries())
      for (const { node } of collect(b, p.rel, i)) {
        stats.nodes++;
        if (typeOf(node) === "ImageObject") stats.images++;
        if (isRef(node)) stats.refs++;
      }
  if (failures.length) {
    console.error(`\ncheck-structured-data: ${failures.length} FAILURE(S)`);
    for (const f of failures) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    `check-structured-data: OK — ${htmlFiles.length} pages (${skipped} without JSON-LD), ${stats.nodes} nodes, ${stats.images} ImageObjects, ${stats.refs} references resolve; dates ISO 8601, creators named`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
