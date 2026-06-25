# PostgreSQL — From Zero to Hero

A bilingual (EN/TH), standalone, beginner→advanced course on **PostgreSQL**. From the relational model and SQL through joins, indexing, transactions & MVCC, advanced features (JSONB, full-text search, views, functions & triggers), and production scaling. Every operation is shown across **psql, Node.js, Python, Go, and Rust**, with **pgAdmin** GUI tours, a **Docker** setup, query results shown as psql-style tables, and **Mermaid** diagrams. There's a **read-mode** toggle.

All content is original: original explanations of PostgreSQL (a public technology), original SQL/code examples and result tables, and original diagrams.

> **Note:** PostgreSQL is a server, so it can't run inside the browser — the examples are **illustrative** (real SQL/driver code with the result tables they return), not executed in-page. The Docker setup lesson shows how to run Postgres locally and connect.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Site framework | [Astro 6](https://astro.build) + [Starlight 0.40](https://starlight.astro.build) |
| UI islands | [Preact](https://preactjs.com) (via `@astrojs/preact`) |
| Examples | Starlight built-in `<Tabs syncKey="lang">` + `<TabItem>` — five tabs per operation: **psql** (the SQL), **Node.js** (node-postgres `pg`), **Python** (psycopg 3), **Go** (pgx), **Rust** (sqlx). Driver tabs use parameterized queries. Results shown as psql-style ASCII tables. |
| GUI / setup | **pgAdmin** covered in prose ("In pgAdmin:" notes + a tour; DBeaver mentioned as an alternative); **Docker** setup lesson (`docker run` + `docker-compose.yml`). |
| Diagrams | Client-side, theme-aware **Mermaid** (`<Mermaid>` + `public/enhance.js`) — joins, query plans, MVCC, replication, partitioning |
| Reading | **Read-mode** toggle (hides sidebar/TOC, widens content) via `public/enhance.js` |
| Unit tests | [Vitest](https://vitest.dev) + `@testing-library/preact` |
| i18n | Starlight built-in, `defaultLocale: 'en'`, locales: `en` + `th` |

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:4321
npm run build      # Build production site to ./dist/
npm run preview    # Preview the production build locally
npm test           # Run Vitest unit tests
```

## Content Structure

```
src/content/docs/
  en/                              # English — served at /en/...
    intro-and-setup/               # relational model, Docker setup, psql + pgAdmin, databases & schemas
    tables-and-types/              # CREATE TABLE, data types, constraints, schema migrations
    crud-and-sql/                  # INSERT, SELECT/filtering, UPDATE/DELETE/RETURNING, ON CONFLICT upsert
    joins-and-relationships/       # joins, aggregates/GROUP BY, subqueries & CTEs, window functions
    indexes-and-performance/       # B-tree & specialized indexes, EXPLAIN, query plans, VACUUM
    transactions-and-concurrency/  # transactions, isolation levels, MVCC, locking & deadlocks
    advanced-postgres/             # JSONB, full-text search, views & matviews, functions & triggers
    operations-and-scaling/        # replication, connection pooling, partitioning, backup & security
    index.mdx                      # EN landing (splash)
  th/                              # Thai — served at /th/...
    (same module directories)
    index.mdx
```

## Components & Lesson Template

- **`Mermaid.astro`** `{ code, title }` — hoist the diagram as `export const ...Diagram = \`flowchart ...\`` and render `<Mermaid code={...Diagram} title="..."/>`.
- **`Callout.astro`** `{ title }`, **`Quiz.tsx`** `{ id, questions }` (0-based `answer`, field `q`), **`ProgressTracker.tsx`** `{ id }`.
- Multi-language code uses Starlight's **`{ Tabs, TabItem }`** from `@astrojs/starlight/components` — no custom component.

Per-lesson order (tutorial): frontmatter → imports → concept intro → sections (prose + a 5-tab `<Tabs>` example + a fenced ```text result table + an optional "In pgAdmin:" note) → Tips/gotchas → `<Callout>` → `<Quiz>` → `<ProgressTracker>` (last). IDs follow `<module>/<slug>`.

> **⚠️ Authoring notes:**
> - **Five driver tabs, in order:** psql (` ```sql `), Node.js (`pg`, ` ```js `), Python (psycopg, ` ```python `), Go (pgx, ` ```go `), Rust (sqlx, ` ```rust `). Use **parameterized queries** in the driver tabs (`$1` / `%s`).
> - **Result sets are psql-style ASCII tables** in ` ```text ` blocks using only `|` `-` `+`. **No Unicode box-drawing** anywhere.
> - **Never a bare `{...}` in prose** — SQL/objects go in fenced blocks or `<Tabs>`. **Diagrams are Mermaid**, hoisted in `export const`; **never a `;` inside a Mermaid sequence message** (use `flowchart`). Note: PostgreSQL's `->>` JSONB operator is fine inside ` ```sql ` blocks — it is not a Mermaid arrow.
> - Each lesson **ends on its `<ProgressTracker .../>`** — no stray trailing tags. **Internal links include the base path** and matching locale (`/postgresql-from-zero-to-hero/en/...` on EN, `/th/...` on TH).

## Deployment

Fully static → `dist/`. Base path in `astro.config.mjs`: `site: 'https://avetavos.github.io'`, `base: '/postgresql-from-zero-to-hero'`.

Deployed to GitHub Pages via **branch-source** (`gh-pages`): build `dist/`, add `.nojekyll`, push to `gh-pages`, set **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `/`**, then **request a Pages build** (`gh api -X POST repos/<owner>/<repo>/pages/builds`) — flipping the source alone does not trigger one. If you change `base`, update the base-prefixed links in `src/content/docs/{en,th}/index.mdx`.
