# tools/

## `check-parity.mjs` (`npm run check`)
EN/TH structural parity (headings, fences, quiz, Thai in `<Callout title>` / `<Mermaid title>`).

## `verify-snippets.mjs` (`npm run verify`)
Runs the course's SQL against a **real PostgreSQL** (pinned in `tools/probe/versions.json`, currently `postgres:18.6`)
and `bash -n`-checks shell fences. No host `psql`, no brew: it uses `docker exec … psql` inside the container.

```
npm run verify                    # only fences that carry a path comment (see below)
npm run verify -- --all           # EVERY sql/bash fence, path comment or not (baseline / audit)
npm run verify -- --only crud-and-sql/insert,tables-and-types/constraints
npm run verify -- --self-test     # harness self-check (needs Docker)
npm run verify -- --stop          # remove the shared container
```

Needs Docker running. On first run it starts the shared container `postgresql-verify-db` (host port **55432**,
`127.0.0.1` only, password `verify`, no volume) and leaves it running for the next run and for other agents.
Stop it with `npm run verify -- --stop` (or `docker rm -f postgresql-verify-db`). Override the name with
`PG_VERIFY_CONTAINER`. Bump the pin by editing `tools/probe/versions.json` (image + `postgres` version together).

### Fence convention (first line of the fence, EN and TH byte-identical)
| First line | Meaning |
|---|---|
| `-- sql/<name>.sql` (optional trailing note) | **Collected** sql fence. Run, in document order, in the lesson's own database. Must succeed. |
| `-- @expect-error` / `-- @expect-error 42P01` | Deliberate failure demo. Runs (then `ROLLBACK`s) and the harness **asserts an error occurred**; with a token it must equal / be contained in the SQLSTATE or message (`VERBOSITY=verbose` is on, so SQLSTATE is in the message). Passing silently is a FAILURE. |
| `# scripts/<name>.sh` (bash fence) | `bash -n` syntax check only; never executed. |
| anything else | Fragment: counted as skipped. psql meta-commands (`\d`, `\c`) are fine inside a collected sql fence. |

Fences inside `<TabItem>` are dedented automatically. Fences inside `export const quiz… = [ … ]` and
`<SpotTheBug code={\`…\`}>` are excluded from collection.

### Execution model
* One fresh **database per lesson** (`CREATE DATABASE v_<module>_<lesson> TEMPLATE template0`), dropped afterwards, so
  `CREATE DATABASE`, `VACUUM`, `CREATE INDEX CONCURRENTLY` etc. work in fences. Roles created by a lesson are dropped too.
* **Lessons must be self-contained**: the first collected fence creates (and seeds) every table the lesson uses;
  do not rely on tables from a sibling lesson or the module `index.mdx`. Gate on a clean DB.
* All collected sql fences of a lesson go to ONE psql session with `ON_ERROR_STOP` off, so each fence gets its own
  verdict; errors are mapped back to `file:line (fence N)`.
* Multi-session demos (two terminals: deadlock, write skew, lock waits) are not expressible in one session: mark those
  fences as fragments and prove them with a scratch script of two `docker exec psql` processes (see the Step A review §5).
* Fences that need a second server (`CREATE SUBSCRIPTION`, `pg_basebackup`) are fragments, proven in a scratch
  two-container network (`--internal`), not by this harness.
