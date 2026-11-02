#!/usr/bin/env node
// Mutation check for the structured-data gate's self-test (2026-11-02; the
// pattern of check-crosslinks.mutants.mjs — a self-test case that stays green
// when the code path it claims to pin is broken is no receipt). Each MUTANT
// breaks exactly one rule by a literal source edit; the mutated gate, run from
// a directory with no dist/, must FAIL ITS OWN SELF-TEST (exit 3). Exit 2
// ("no dist") means the self-test passed and the mutant SURVIVED — a vacuous
// pin. Zero dependencies; ~1 s. Runs after the gate on CI and via
// `npm run check:schema`.
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
  ["D2 scope: nested list items held to the full form (the bibliography pin)", "(top && ARTICLE_TYPES.has(type) &&", "(ARTICLE_TYPES.has(type) &&"],
  ["D1 dead: any string passes as a date", "if (!(ISO_DATE.test(value) || ISO_DATETIME.test(value)))", "if (false)"],
  ["D1: the calendar-day check dropped", "if (!calendarOk(value))", "if (false)"],
  ["D1: a zone-less date-time accepted", "(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)$/", "(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/"],
  ["D1: a non-string date accepted", 'if (typeof value !== "string") {', "if (false) {"],
  ["I2 dead: a missing creator passes", "if (!creator) failures.push", "if (false) failures.push"],
  ["I2: a bare creator reference passes", "else if (isRef(creator)) failures.push", "else if (false) failures.push"],
  ["I2: a creator of any type passes", "!CREATOR_TYPES.has(typeOf(creator))", "false"],
  ["I2: a nameless creator passes", 'else if (typeof creator.name !== "string" || !creator.name.trim())', "else if (false)"],
  ["I1: a relative contentUrl passes", 'else if (!/^https?:\\/\\//.test(contentUrl))', "else if (false)"],
  ["I1: an unbuilt on-site contentUrl passes", "if (!fileExists(pathname))", "if (false)"],
  ["I3: contentUrl counts as a credit field", 'const CREDIT_PROPS = ["creditText", "copyrightNotice", "license"];', 'const CREDIT_PROPS = ["creditText", "copyrightNotice", "license", "contentUrl"];'],
  ["I3: a license without acquireLicensePage passes", "if (node.license && !node.acquireLicensePage)", "if (false)"],
  ["R1 dead: dangling references pass", "if (!resolved) failures.push", "if (false) failures.push"],
  ["R1: the same-page set emptied", 'new Set(["mainEntity", "creator", "author", "publisher"])', "new Set([])"],
  ["R1: every id treated as an estate identity", "globalDefs.has(id) || estateIds.has(id)", "true"],
  ["R2 dead: one @id with two types passes", "if (types.size > 1)", "if (types.size > 99)"],
  ["P1 dead: a ProfilePage without mainEntity passes", "if (!me) failures.push", "if (false) failures.push"],
  ["P1: a nameless mainEntity passes", '|| typeof target.name !== "string" || !target.name.trim())', ")"],
  ["parse: a typeless block passes", '!(Array.isArray(j["@graph"]) || j["@type"])', "false"],
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
