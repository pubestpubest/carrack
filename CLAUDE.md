# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Carrack** — a web app for Black Desert Online (BDO) players to track crafting progress toward the Epheria Carrack ship. Core loop: set a target item → recipe tree is expanded to raw materials → gap analysis vs. inventory → progress %, todos, and atomic craft execution. UI is **Thai-first** (most user-facing copy is Thai; items carry both `name` and `name_th`).

See `PRD.md` (product) and `TECHNICAL_DESIGN.md` (infra) for the full intent. `erd.mermaid` is the data model.

## Commands

```bash
npm run dev      # local dev server (next dev)
npm run build    # production build (output: standalone)
npm run lint     # next lint — the only automated check; run before committing
```

There is **no test framework**. The vision pipeline has ad-hoc test/calibration scripts run directly with `tsx`:

```bash
npx tsx scripts/scan-test.ts       # run the scanner against scripts/inputs/ fixtures
npx tsx scripts/full-test.ts       # end-to-end vision diagnostics
npx tsx scripts/calibrate.ts       # tune match thresholds
npx tsx scripts/build-digit-templates.ts   # regenerate lib/vision/digit-templates.json
```

Data-pipeline scripts (`.mjs`, run with `node`) scrape/seed the catalogue: `extract-items.mjs` → `build-items-json.mjs` → `download-item-images.mjs`. These produce `items.json` and `public/images/items/*`.

## Architecture

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind 3 · Supabase (Postgres + Auth + Storage). `@/*` path alias maps to repo root.

**Three layers worth understanding before editing:**

1. **Supabase data + auth.** All DB access goes through `@supabase/ssr` clients:
   - `lib/supabase/server.ts` — server components & API routes (`await createClient()`)
   - `lib/supabase/client.ts` — client components
   - `lib/supabase/middleware.ts` — session refresh + route guarding, wired up in root `middleware.ts`
   - Auth gating is in middleware: everything requires login **except** `/auth/*`, `/catalogue/*`, `/releases/*`. There is no `users` table for passwords — Supabase `auth.users` is the source; a `profiles` row is auto-created by the `on_auth_user_created` trigger.
   - **RLS is the security boundary**, not app code: catalogue tables are `public_read`; all `user_*` tables use an `own_data` policy (`auth.uid() = user_id`). Queries still filter `.eq('user_id', user.id)` defensively. Types come from `lib/types/database.ts` (Supabase-generated — `Tables<'x'>`, `TablesInsert<'x'>`, `TablesUpdate<'x'>`); regenerate it when the schema changes rather than hand-editing.

2. **Gap-analysis engine** (`lib/gap-analysis.ts`) — pure functions, no I/O, the heart of the product. `expand()` recursively walks the recipe DAG (`recipes` + `recipe_ingredients`) turning a target into leaf material quantities. Two entry points: `computeGap()` (flat, equipment treated as leaves) and `computeGapTree()` (top-level recipe ingredients with `subRows` for missing equipment). Key behaviors: `stopAtItemId` halts the hull chain at a ship the user already owns; `makeGapRowAlloc` + a shared `allocatedMap` prevent the same inventory units being counted as available across multiple sub-recipes. `mergeGaps()`/`overallProgress()` combine across goals. Callers (API routes, server components) fetch the four tables and hand them in.

3. **Inventory screenshot scanner** (`lib/vision/*`) — a hand-rolled computer-vision pipeline (no ML lib; `sharp` only) that reads a BDO inventory screenshot into item+quantity candidates. Flow in `scan.ts`: `segment.ts` slices the 5×7 grid → `phash.ts` fingerprints each cell (perceptual hash + color + grade-ring detection) and matches against reference features built from local catalogue icons → `digits.ts` reads the stack quantity via baked digit templates (`digit-templates.json`). Exposed at `POST /app/api/inventory/session/scan` (Node runtime — `sharp` needs it; `export const runtime = 'nodejs'`). Matching thresholds (`ACCEPT_SCORE`, `ACCEPT_MARGIN`) are tuned via the calibration scripts. See `docs/screenshot-import.md`.

**API routes** live in `app/api/**/route.ts`; pages are server components in `app/**/page.tsx` with client islands as sibling `*.tsx` files. Routes follow: get user → 401 if absent → fetch tables → run a pure lib function → mutate.

## Gotchas / divergences from the docs

- **Workspaces are not implemented.** PRD describes multi-user workspaces with Owner/Editor/Viewer roles, but the schema and code are **single-user**: `user_inventory`/`user_goals` key directly on `auth.users.id`. Don't assume workspace tables exist.
- **Craft is not transactional.** `app/api/craft/route.ts` debits ingredients and credits the output as a **sequence of separate upserts** — it pre-checks sufficiency but has no DB transaction/rollback, despite the PRD's "atomic craft" rule. A mid-sequence failure can leave inventory partially mutated. Treat this as a known limitation if touching craft logic.
- **`NEXT_PUBLIC_*` env vars are baked at build time** (into the Dockerfile `builder` stage and the client bundle), not just read at runtime. Changing the Supabase project means rebuilding the image and updating `next.config.ts` `images.remotePatterns` (currently hardcoded to one Supabase hostname).
- **Migrations** in `supabase/migrations/` were applied via the Supabase MCP, not necessarily `supabase db push`. They are the schema-of-record; keep them and `lib/types/database.ts` in sync.

## Deploy

Push to `main` → GitHub Actions (`.github/workflows/push.yaml`) builds the standalone Docker image, pushes to Docker Hub, and POSTs an HMAC-signed webhook that triggers the VPS to pull & restart. `paths-ignore: **.md` so doc-only commits don't redeploy. No staging environment.
