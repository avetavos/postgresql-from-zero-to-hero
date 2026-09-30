#!/usr/bin/env node
// Snippet-verification harness for the bilingual PostgreSQL course.
// Real proof = a real PostgreSQL (pinned in tools/probe/versions.json) in a
// shared local container, driven by the real `psql` inside it (no host psql,
// no brew). See tools/README.md for the fence convention.
//
//   node tools/verify-snippets.mjs                 collected fences only
//   node tools/verify-snippets.mjs --all           EVERY sql/bash fence (baseline)
//   node tools/verify-snippets.mjs --only mod/lesson[,mod/lesson]
//   node tools/verify-snippets.mjs --self-test
//   node tools/verify-snippets.mjs --stop          remove the shared container
//
// Execution model: one fresh DATABASE per lesson (created from template0,
// dropped afterwards; roles the lesson created are dropped too), sql fences
// fed in document order to ONE psql session with ON_ERROR_STOP off, so every
// fence gets its own verdict. Lessons must therefore create their own tables.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_EN = path.join(REPO_ROOT, 'src/content/docs/en');
const V = JSON.parse(readFileSync(path.join(REPO_ROOT, 'tools/probe/versions.json'), 'utf8'));
const CT = process.env.PG_VERIFY_CONTAINER ?? V.container;

// -- Fence conventions --------------------------------------------------------
const SQL_PATH_RE = /^-- (sql\/[\w.-]+\.sql)(?:\s+\S.*)?$/;
const BASH_PATH_RE = /^# (scripts\/[\w.-]+\.sh)(?:\s+\S.*)?$/;
const EXPECT_RE = /@expect-error(?:\s+(\S+))?/;

function parseStringAt(text, i) {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length) {
    const c = text[j];
    if (c === '\\') {
      j += 2;
      continue;
    }
    if (c === quote) {
      j++;
      break;
    }
    j++;
  }
  return { end: j };
}

function scanBalanced(text, start, open, close) {
  let depth = 1;
  let i = start;
  while (i < text.length && depth > 0) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      i = parseStringAt(text, i).end;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) depth--;
    i++;
  }
  return i;
}

function findExcludedRanges(src) {
  const ranges = [];
  {
    const re = /export\s+const\s+\w+\s*=\s*\[/g;
    let m;
    while ((m = re.exec(src))) {
      const end = scanBalanced(src, re.lastIndex, '[', ']');
      ranges.push([m.index, end]);
      re.lastIndex = end;
    }
  }
  {
    const re = /<SpotTheBug\s+code=\{\s*`/g;
    let m;
    while ((m = re.exec(src))) {
      const backtickIdx = m.index + m[0].length - 1;
      const { end } = parseStringAt(src, backtickIdx);
      ranges.push([m.index, end]);
      re.lastIndex = end;
    }
  }
  return ranges;
}

function stripExcluded(src, ranges) {
  if (!ranges.length) return src;
  ranges.sort((a, b) => a[0] - b[0]);
  let out = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue;
    out += src.slice(cursor, start);
    out += src.slice(start, end).replace(/[^\n]/g, '');
    cursor = end;
  }
  out += src.slice(cursor);
  return out;
}


function countNewlinesBefore(s, upto) {
  let n = 0;
  for (let i = 0; i < upto; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

// -- Fence collection ---------------------------------------------------------
// Fences inside <TabItem> are indented; the fence's own indent is stripped
// from every body line. fenceNum is 1-based over ALL fences (any language).
export function collectFences(rawSrc, { all = false } = {}) {
  const src = stripExcluded(rawSrc, findExcludedRanges(rawSrc));
  const fenceRe = /^([ \t]*)```(\w*)[^\n]*\n([\s\S]*?)^[ \t]*```/gm;
  const out = [];
  let n = 0;
  let m;
  while ((m = fenceRe.exec(src))) {
    n++;
    const [, indent, lang, raw] = m;
    if (lang !== 'sql' && lang !== 'bash') continue;
    const body = raw.split('\n').map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l.trimStart())).join('\n');
    const line = countNewlinesBefore(src, m.index) + 1;
    const first = body.split('\n')[0].trim();
    const ex = EXPECT_RE.exec(first);
    const pm = (lang === 'sql' ? SQL_PATH_RE : BASH_PATH_RE).exec(first);
    if (ex) out.push({ n, lang, line, body, cat: 'expect-error', expect: ex[1] ?? '' });
    else if (pm || all) out.push({ n, lang, line, body, cat: 'run', path: pm?.[1] ?? '(no path)' });
    else out.push({ n, lang, line, cat: 'skipped' });
  }
  return out;
}

// -- Container ----------------------------------------------------------------
const sh = (cmd, args, input) => spawnSync(cmd, args, { encoding: 'utf8', input, maxBuffer: 64 << 20 });
const psql = (db, input, extra = []) =>
  sh('docker', ['exec', '-i', CT, 'psql', '-U', 'postgres', '-X', '-q', '-d', db, '-v', 'VERBOSITY=verbose', ...extra, '-f', '-'], input);

function ensureContainer() {
  const st = sh('docker', ['inspect', '-f', '{{.State.Running}}', CT]);
  if (st.stdout.trim() !== 'true') {
    if (st.status === 0) sh('docker', ['rm', '-f', CT]);
    const r = sh('docker', ['run', '-d', '--name', CT, '-e', 'POSTGRES_PASSWORD=verify', '-p', `127.0.0.1:${V.hostPort}:5432`, V.image]);
    if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
  }
  for (let i = 0; i < 60; i++) {
    // pg_isready is true during the init-time temp server too; require a real query on the final server
    const q = sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-Atc', 'select 1']);
    if (q.stdout.trim() === '1' && !/initdb|temporary/.test(sh('docker', ['logs', '--tail', '3', CT]).stderr.split('\n').slice(-2).join(''))) break;
    sh('sleep', ['1']);
  }
  const ver = sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-Atc', 'show server_version']).stdout.trim();
  if (!ver.startsWith(V.postgres)) console.warn(`WARN: server_version ${ver} != pinned ${V.postgres}`);
  return ver;
}

const rolesNow = () =>
  new Set(sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-Atc', "select rolname from pg_roles where rolname !~ '^pg_'"]).stdout.split('\n').filter(Boolean));

// -- Run one lesson -----------------------------------------------------------
// Returns [{fence, ok, msg}] for every non-skipped fence.
export function runLesson(name, fences) {
  const db = ('v_' + name.replace(/[^a-z0-9]+/gi, '_')).toLowerCase().slice(0, 60);
  const results = [];
  const sqlF = fences.filter((f) => f.lang === 'sql' && f.cat !== 'skipped');
  for (const f of fences.filter((f) => f.lang === 'bash' && f.cat === 'run')) {
    const r = sh('bash', ['-n'], f.body);
    results.push({ fence: f, ok: r.status === 0, msg: r.stderr.trim().split('\n')[0] });
  }
  if (!sqlF.length) return results;
  const before = rolesNow();
  sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-qc', `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`]);
  const c = sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-qc', `CREATE DATABASE ${db} TEMPLATE template0`]);
  if (c.status !== 0) throw new Error(c.stderr);
  let buf = '';
  let cur = 0;
  const ranges = [];
  for (const f of sqlF) {
    const lines = f.body.replace(/\n$/, '').split('\n');
    ranges.push({ f, from: cur + 1, to: cur + lines.length + 1, errs: [] });
    buf += lines.join('\n') + '\n;\n';               // trailing ; terminates an unterminated last statement
    cur += lines.length + 1;
    if (f.cat === 'expect-error') { buf += 'ROLLBACK;\n'; cur += 1; }  // leave no aborted tx behind
  }
  const r = psql(db, buf);
  for (const l of (r.stderr ?? '').split('\n')) {
    const m = /^psql:<stdin>:(\d+): (ERROR|FATAL):\s+(.*)$/.exec(l);
    if (!m) continue;
    const rg = ranges.find((x) => +m[1] >= x.from && +m[1] <= x.to);
    if (rg) rg.errs.push(m[3]);
  }
  for (const { f, errs } of ranges) {
    if (f.cat === 'expect-error') {
      const hit = errs.length > 0 && (!f.expect || errs.some((e) => e.includes(f.expect)));
      results.push({ fence: f, ok: hit, msg: hit ? '' : errs.length ? `expected ${f.expect}, got: ${errs[0]}` : 'expected an error, statement succeeded' });
    } else results.push({ fence: f, ok: errs.length === 0, msg: errs[0] ?? '' });
  }
  sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-qc', `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`]);
  for (const role of rolesNow()) if (!before.has(role)) sh('docker', ['exec', CT, 'psql', '-U', 'postgres', '-qc', `DROP OWNED BY "${role}"; DROP ROLE "${role}"`]);
  return results;
}

// -- Lessons ------------------------------------------------------------------
function lessons() {
  const out = [];
  for (const mod of readdirSync(DOCS_EN).sort()) {
    const d = path.join(DOCS_EN, mod);
    if (!statSync(d).isDirectory()) continue;
    for (const f of readdirSync(d).sort()) if (f.endsWith('.mdx')) out.push({ name: `${mod}/${f.slice(0, -4)}`, file: path.join(d, f) });
  }
  return out;
}

function selfTest() {
  const ver = ensureContainer();
  const doc = [
    '```sql', '-- sql/a.sql', 'CREATE TABLE t (id int);', 'INSERT INTO t VALUES (1);', '```',
    '<TabItem>', '    ```sql', '    -- sql/b.sql', '    SELECT * FROM t', '    ```', '</TabItem>',
    '```sql', '-- @expect-error 42P01', 'SELECT * FROM nope;', '```',
    '```sql', '-- @expect-error', 'SELECT 1;', '```',            // must be flagged: no error occurs
    '```sql', '-- sql/c.sql', 'SELEC 1;', '```',                  // must be flagged: syntax error
    '```sql', 'SELECT fragment;', '```',                          // no path: skipped
    'export const q = [{ q: `x`, explain: ````sql\nBOOM\n```` }];',
  ].join('\n');
  const fences = collectFences(doc);
  const res = runLesson('selftest/demo', fences);
  const by = (n) => res.find((r) => r.fence.n === n);
  const checks = [
    ['collected 5 sql + 1 skipped', fences.length === 6 && fences.filter((f) => f.cat === 'skipped').length === 1],
    ['fence a ok', by(1)?.ok],
    ['indented tab fence b ok (sees table t)', by(2)?.ok],
    ['expect-error 42P01 asserted', by(3)?.ok],
    ['expect-error that does not fail is flagged', by(4)?.ok === false],
    ['syntax error flagged', by(5)?.ok === false],
  ];
  for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
  const bad = checks.filter(([, ok]) => !ok).length;
  console.log(`\nself-test: ${bad ? 'FAIL' : 'PASS'} (PostgreSQL ${ver})`);
  process.exit(bad ? 1 : 0);
}

// -- main ---------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes('--stop')) { sh('docker', ['rm', '-f', CT]); console.log(`removed ${CT}`); process.exit(0); }
if (args.includes('--self-test')) selfTest();
const all = args.includes('--all');
const oi = args.indexOf('--only');
const only = oi >= 0 ? args[oi + 1].split(',') : null;
const ver = ensureContainer();
console.log(`PostgreSQL ${ver} in container ${CT} (port ${V.hostPort})${all ? ' [--all: every fence]' : ''}`);
let ran = 0, failed = 0, skipped = 0, expected = 0, badLessons = 0;
for (const l of lessons()) {
  if (only && !only.includes(l.name)) continue;
  const fences = collectFences(readFileSync(l.file, 'utf8'), { all });
  skipped += fences.filter((f) => f.cat === 'skipped').length;
  const res = runLesson(l.name, fences);
  const bad = res.filter((r) => !r.ok);
  ran += res.length; failed += bad.length; expected += res.filter((r) => r.ok && r.fence.cat === 'expect-error').length;
  if (bad.length) badLessons++;
  for (const r of bad) console.log(`FAIL ${l.name}.mdx:${r.fence.line} (fence ${r.fence.n}): ${r.msg}`);
}
console.log(`\n${ran} fences run (${expected} expected-error ok), ${skipped} skipped (no path comment), ${failed} FAILED in ${badLessons} lessons`);
process.exit(failed ? 1 : 0);
