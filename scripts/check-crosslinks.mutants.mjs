#!/usr/bin/env node
// Mutation check for the cross-link gate's self-test (2026-10-23, round-2
// ruling: a self-test case that stays green when the code path it claims to
// pin is broken is no receipt — two such cases shipped in the first fold).
// Each MUTANT breaks exactly one code path by a literal source edit; the
// mutated gate, run from a directory with no dist/, must FAIL ITS OWN
// SELF-TEST (exit 3). Exit 2 ("no dist") means the self-test passed and the
// mutant SURVIVED — a vacuous pin. Zero dependencies; ~2 s. Runs after the
// gate on CI and via `npm run check:links`.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC = "scripts/check-crosslinks.mjs";
const gate = readFileSync(SRC, "utf8");

// [name, anchor (must occur exactly once), replacement]
const MUTANTS = [
  ["`#` dropped from the path boundary (fragment escapes)", '#—–….,;:!?";', '—–….,;:!?";'],
  ["`?` dropped from the path boundary (query escapes)", '….,;:!?";', '….,;:!";'],
  ["leading path boundary: whitespace-only and consuming", "(?<=^|[${BOUND}])", "(?:^|[\\\\s])"],
  ["root extension dropped (dotted root file truncated)", "(?:\\\\.[A-Za-z0-9]+)?(?:/${SEG})*", "(?:/${SEG})*"],
  ["download route missing from PATH_ROOTS", '|resume|images|about";', '|images|about";'],
  ["exemption consulted before the link check (stale rows never die)", "if (!linked && !exemption(rule.id)) {", "if (!exemption(rule.id) && !linked) {"],
  ["derived title needles case-sensitive", '(?![A-Za-z0-9])`, "i");', '(?![A-Za-z0-9])`);'],
  ["title guards dropped (glued letters count as mentions)", "(?<![A-Za-z0-9])${escapeRe(phrase)}(?![A-Za-z0-9])", "${escapeRe(phrase)}"],
  ["recap qualifier never stripped (talk-title form escapes)", "  if (bare !== title) needles.push(titleNeedle(bare));\n", ""],
  ["inline tags become spaces (mid-token splits escape)", '.replace(INLINE_TAG_RE, "")', '.replace(INLINE_TAG_RE, " ")'],
  ["`sup` treated as inline (footnote markers fuse)", '|time|u|var";', '|time|u|var|sup";'],
  ["`span` treated as inline (the talk row's title and event fuse)", '|time|u|var";', '|time|u|var|span";'],
  ["read-next cards never stripped", 'const isRelated = (attrs) => classTokens(attrs).includes("related");', "const isRelated = (attrs) => false;"],
  ["read-next strip by word match (`related-work` stripped too)", 'const isRelated = (attrs) => classTokens(attrs).includes("related");', "const isRelated = (attrs) => /\\brelated\\b/.test(attrs);"],
  ["`&apos;` not decoded", "    .replace(/&apos;/g, \"'\")\n", ""],
  ["soft hyphen kept in norm (a headline's U+00AD never matches)", 's.replace(/­/g, "").replace(/[’‘]/g, "\'")', 's.replace(/[’‘]/g, "\'")'],
  ["post target case-insensitive (a wrong-case href passes)", "/?(?:[#?].*)?$`),", '/?(?:[#?].*)?$`, "i"),'],
  ["single-quoted href ignored", 'href=(["\'])(.*?)\\1/)?.[2]', 'href=(")(.*?)\\1/)?.[2]'],
  ["self-path not segment-safe (fooindex.html self-exempts)", 'rel.replace(/(^|\\/)index\\.html$/, "$1")', 'rel.replace(/index\\.html$/, "")'],
  ["slug lookbehind without `/` (a slug inside a bare path counts twice)", "(?<![A-Za-z0-9/._=#?&-])", "(?<![A-Za-z0-9._=#?&-])"],
  ["slug lookahead without `.` (slug.pdf counts as prose)", '(?![A-Za-z0-9._-])`, "i")', '(?![A-Za-z0-9-])`, "i")'],
  ["longest-match-wins off (a prefix headline fires inside the longer title)", "if (hit && !ownedByLonger(rule, hit)) {", "if (hit) {"],
  ["derived rules on the full text (a title in a code sample counts)", "const hay = rule.derived ? prose : text;\n    return rule.needles", "const hay = text;\n    return rule.needles"],
];

const dir = mkdtempSync(join(tmpdir(), "crosslinks-mutants-"));
const empty = join(dir, "empty");
spawnSync("mkdir", ["-p", empty]);
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
  console.error(`check-crosslinks mutants: ${problems.length} PROBLEM(S)`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log(`check-crosslinks mutants: OK — ${MUTANTS.length} mutants, each caught by the gate's self-test`);
