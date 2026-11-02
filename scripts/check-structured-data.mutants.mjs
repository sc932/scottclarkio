#!/usr/bin/env node
// Mutation check for the structured-data gate's self-test (2026-11-02; the
// pattern of check-crosslinks.mutants.mjs — a self-test case that stays green
// when the code path it claims to pin is broken is no receipt). Each MUTANT
// edits exactly one code path by a literal source edit; the mutated gate, run
// from a directory with no dist/, must FAIL ITS OWN SELF-TEST (exit 3). Exit
// 2 ("no dist") means the self-test passed and the mutant SURVIVED — a
// vacuous pin. A mutant proves a self-test case is WIRED to the path it
// names (some flip a rejection into a different diagnostic rather than into
// a pass; the case still catches the edit). Zero dependencies; ~1 s. Runs
// after the gate on CI and via `npm run check:schema`.
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC = "scripts/check-structured-data.mjs";
const gate = readFileSync(SRC, "utf8");

// [name, anchor (must occur exactly once), replacement]
const MUTANTS = [
  ["D2 dead: DateTime fields accept a calendar date", "if (full && !ISO_DATETIME.test(value))", "if (false)"],
  ["D2 scope: ProfilePage dates dropped from the DateTime set", '"ProfilePage.dateCreated", "ProfilePage.dateModified", "VideoObject.uploadDate"', '"VideoObject.uploadDate"'],
  ["D1 dead: any string passes as a date", "if (!(ISO_DATE.test(value) || ISO_DATETIME.test(value)))", "if (false)"],
  ["D1: the calendar-day check dropped", "if (!calendarOk(value))", "if (false)"],
  ["D1: a zone-less date-time accepted", "(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)$/", "(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/"],
  ["D1: a non-string date accepted", 'if (typeof value !== "string") {', "if (false) {"],
  ["I2 dead: a missing creator passes", "if (!node.creator || !creators.length) failures.push", "if (false) failures.push"],
  ["I2: a bare creator reference passes", "if (isRef(creator)) failures.push", "if (false) failures.push"],
  ["I2: a creator of any type passes", "!isNode(creator) || !hasType(creator, CREATOR_TYPES)", "false"],
  ["I2: a nameless creator passes", 'else if (typeof creator.name !== "string" || !creator.name.trim())', "else if (false)"],
  ["I1: a relative contentUrl passes", 'else if (!/^https?:\\/\\//.test(contentUrl))', "else if (false)"],
  ["I1: an unbuilt on-site contentUrl passes", "!imageExists(pathname)", "false"],
  ["I3: contentUrl counts as a credit field", 'const CREDIT_PROPS = ["creditText", "copyrightNotice", "license"];', 'const CREDIT_PROPS = ["creditText", "copyrightNotice", "license", "contentUrl"];'],
  ["I3: a license without acquireLicensePage passes", "if (node.license && !node.acquireLicensePage)", "if (false)"],
  ["R1 dead: dangling references pass", "if (!resolved) failures.push(`${path}: dangling reference", "if (false) failures.push(`${path}: dangling reference"],
  ["R1: the same-page set emptied", 'new Set(["mainEntity", "creator", "author", "publisher"])', "new Set([])"],
  ["R1: every id treated as an estate identity", "globalDefs.has(id) || estateIds.has(id)", "true"],
  ["R2 dead: one @id with two types passes", "if (types.size > 1)", "if (types.size > 99)"],
  ["P1 dead: a ProfilePage without mainEntity passes", "if (!node.mainEntity || !mes.length) failures.push", "if (false) failures.push"],
  ["P1: a nameless mainEntity passes", '&& typeof target.name === "string" && target.name.trim())', ")"],
  ["parse: a typeless block passes", '!(Array.isArray(j["@graph"]) || j["@type"])', "false"],
  // round-1 folds (2026-11-02): strictness mutants — an edit that wrongly REJECTS a correct shape must be caught too
  ["strictness: an estate identity no longer trusted", "globalDefs.has(id) || estateIds.has(id)", "globalDefs.has(id)"],
  ["strictness: an off-site contentUrl checked against dist", "else if (contentUrl.startsWith(`${siteUrl}/`)) {", "else {"],
  ["strictness: isPartOf must resolve on the same page", 'new Set(["mainEntity", "creator", "author", "publisher"])', 'new Set(["mainEntity", "creator", "author", "publisher", "isPartOf"])'],
  ["strictness: an inline mainEntity refused", "isNode(me) ? me : null", "null"],
  ["strictness: list items held to the full date-time form", '!parentTypes.includes("ListItem") && types.some((t) => ARTICLE_TYPES.has(t))', "types.some((t) => ARTICLE_TYPES.has(t))"],
  ["arrays: a multi-typed creator judged by its first type only", "hasType(creator, CREATOR_TYPES)", "CREATOR_TYPES.has(typeOf(creator))"],
  ["arrays: an array of creators refused wholesale", "Array.isArray(node.creator) ? node.creator : [node.creator]", "[node.creator]"],
  ["graphs: a nested @graph skipped", 'if (k === "@graph" && Array.isArray(val))', "if (false)"],
  ["R2: type sets collapsed to the first type", '[...new Set(typesOf(node))].sort().join("\\u0000")', "typeOf(node)"],
  ["I1: a malformed contentUrl crashes instead of failing", "pathname = decodeURIComponent(new URL(contentUrl).pathname);", "pathname = new URL(contentUrl).pathname;"],
  ["parse: an unparseable block swallowed", "errors.push(`unparseable JSON-LD: ${e.message}`);", "void e;"],
  ["I1 dead: a missing contentUrl passes", 'if (typeof contentUrl !== "string" || !contentUrl) failures.push', "if (false) failures.push"],
  ["parse: the tag match reverted to the exact literal (blind on drift)", '/<script\\b[^>]*\\stype\\s*=\\s*["\']application\\/ld\\+json["\'][^>]*>([\\s\\S]*?)<\\/script>/gi', '/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g'],
  ["parse: a script tag mentioning ld+json with no block passes silently", "if (!blocks.length && !errors.length && /<script\\b[^>]*ld\\+json/i.test(html))", "if (false)"],
  ["D1: availabilityStarts/Ends unchecked", '"availabilityStarts", "availabilityEnds"', '"availabilityStarts"'],
  ["D1: the extra date keys emptied", '"validFrom", "validThrough", "expires", "lastReviewed",', ""],
  ["dispatch: an ImageObject typed second in its @type array skipped", 'if (types.includes("ImageObject")) {', 'if (typeOf(node) === "ImageObject") {'],
  ["dispatch: a ProfilePage typed second in its @type array skipped", 'if (types.includes("ProfilePage")) {', 'if (typeOf(node) === "ProfilePage") {'],
  ["R1: a typed reference to nothing passes", "if (!resolved) failures.push(`${path}: typed reference", "if (false) failures.push(`${path}: typed reference"],
  ["I1: a page accepted as image content", "if (pathname !== null && !IMAGE_EXT.test(pathname))", "if (false)"],
  ["I3: a license label accepted as a URL", 'for (const p of ["license", "acquireLicensePage"])', "for (const p of [])"],
  ["P2 dead: a ProfilePage without dates passes", 'for (const d of ["dateCreated", "dateModified"])', "for (const d of [])"],
  // round-3 folds (2026-11-02)
  ["parse: data-type= accepted as the type attribute", '[^>]*\\stype\\s*=\\s*["\']application', '[^>]*type\\s*=\\s*["\']application'],
  ["R1: a typed mainEntity reference skipped", "if (isTypedRef(node) && !underImageCreator) {", 'if (isTypedRef(node) && !underImageCreator && prop !== "mainEntity") {'],
  ["R1: a typed reference resolved by another page's definition for a same-page property", "else if (SAME_PAGE_PROPS.has(prop) && !here)", "else if (false)"],
  ["R1: a fragment id resolved by its page", "return u.hash ? null : decodeURIComponent(u.pathname);", "return decodeURIComponent(u.pathname);"],
  ["P1: a typed mainEntity reference not resolved through the definitions", "isRef(me) || isTypedRef(me) ? defs.get", "isRef(me) ? defs.get"],
  ["D2: a parent typed [Thing, ListItem] loses the exemption", '!parentTypes.includes("ListItem")', '!(parentTypes[0] === "ListItem")'],
  ["R2: duplicate types in one @type array read as a different set", '[...new Set(typesOf(node))].sort().join("\\u0000")', '[...typesOf(node)].sort().join("\\u0000")'],
  ["collect: a typed root block with a @graph loses its root node", '&& !block["@type"] ? block["@graph"] : [block]', '? block["@graph"] : [block]'],
  ["P2: an empty date array accepted", '|| (Array.isArray(node[d]) && !node[d].length)', ""],
  ["D1: sdDatePublished unchecked", '"sdDatePublished", "contentReferenceTime"', '"contentReferenceTime"'],
  ["N1 dead: a page outside the set with no JSON-LD passes", "if (!blocks.length && !errors.length && !set.has(rel)) return", "if (false) return"],
  ["R1: any typed reference resolved by a built page", "pageTyped && pathOnSite !== null", "pathOnSite !== null"],
];

const dir = mkdtempSync(join(tmpdir(), "structured-data-mutants-"));
const empty = join(dir, "empty");
mkdirSync(empty);
const runGate = (src) => {
  const file = join(dir, "gate.mjs");
  writeFileSync(file, src);
  const r = spawnSync(process.execPath, [file], { cwd: empty, encoding: "utf8" });
  return r.status;
};

const problems = [];
// Sanity: the unmutated gate passes its self-test and only complains about the missing dist.
const base = runGate(gate);
if (base !== 2) problems.push(`the unmutated gate exited ${base} from an empty dir (expected 2: self-test green, no dist)`);

for (const [name, anchor, replacement] of MUTANTS) {
  const n = gate.split(anchor).length - 1;
  if (n !== 1) {
    problems.push(`mutant "${name}": anchor occurs ${n} times (expected exactly once) — update the mutant with the gate`);
    continue;
  }
  // A function replacement: `$` sequences in the replacement stay literal.
  const status = runGate(gate.replace(anchor, () => replacement));
  if (status !== 3) problems.push(`mutant "${name}" SURVIVED (gate exited ${status}, expected 3): the self-test does not pin this path`);
}
rmSync(dir, { recursive: true, force: true });

if (problems.length) {
  console.error(`check-structured-data mutants: ${problems.length} PROBLEM(S)`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log(`check-structured-data mutants: OK — ${MUTANTS.length} mutants, each caught by the gate's self-test`);
