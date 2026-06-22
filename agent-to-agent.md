# Agent-to-Agent Handover

Living handover notes between Claude Code sessions. `CLAUDE.md` is the durable codebase
guide; **this file is the volatile "what just happened / what's next / what bit me" log.**
Read it first when picking up work; update **Current state** + **Log** before you end a
session — especially if you leave work in-flight. Keep entries dated and short; delete what's
no longer true.

## Hard-won gotchas (verify before trusting)

- **Git may already hold the work.** Last session's edits were committed (`f35d390`) even
  though the verbal handoff implied "nothing committed." Run `git status` + `git log --oneline -5`
  before assuming anything — a clean tree ≠ work not done.
- **`node_modules` is not checked in and may be absent.** A typecheck spewing
  `Cannot find module 'react'` means run `npm ci` first — those aren't real errors.
- **Live Supabase is the source of truth, not `supabase/migrations/`.** Schema/data changes
  are applied via the Supabase MCP (`apply_migration` / `execute_sql`). The repo's migration
  folder lags Supabase's real history (check `list_migrations`). Don't trust the seed `.sql`
  files to reflect live schema/data — query the DB.
- **`business-logic-inventory-todo-tracking.md` is the product spec** and is often *ahead* of
  the DB. When DB/code/doc disagree, this doc usually states the intended behavior.
- **Pushing to `main` deploys to production** (GitHub Actions → Docker Hub → VPS webhook).
  `paths-ignore: **.md` → doc-only pushes skip the redeploy; any code/script file triggers a
  full build+deploy. No staging environment.
- **Production mutations need explicit user sign-off.** The auto-mode classifier will (rightly)
  block `apply_migration` against live data until the user has approved that specific change.
  Confirm impact first, then apply.
- **`.env.local`** holds the Supabase URL + anon key for local runs/scripts; it's git-ignored.
  Catalogue tables are `public_read`, so anon-key scripts read recipes/items/ingredients fine
  (user inventory needs auth → empty under anon, which is great for testing full expansion).

## How to verify gap-analysis work

- `npm run lint` and `npx tsc --noEmit` (after `npm ci`).
- `export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/ship-gap-test.ts` — runs the
  pure engine against the **live catalogue** and asserts hull-chain expansion, `stopAtItemId`
  truncation, and the Carrack→hull requirement. Extend it whenever you touch
  `lib/gap-analysis.ts`.

## Current state (2026-06-22)

**Ships feature: DONE, live, verified.**
- Ship items (86–92) + hull build chain (recipes 18–23) seeded live; each ship's build recipe
  consumes its predecessor (Batali→Sailboat→…→Caravel and Batali→Frigate→…→Galleass).
- `lib/gap-analysis.ts`: `stopAtItemId` (halt the hull chain at a ship the user already owns) +
  ship sub-recipe expansion — committed `f35d390`, deployed.
- Goal creation accepts any-tier ship target + current-ship picker; catalogue has a `ship` filter.
- Carrack recipes 14–17 re-chained to consume their base hull (Advance/Balance→Caravel `91`,
  Valor/Volante→Galleass `92`) — migration `rechain_carrack_recipes_to_hull`. Matches the doc.
- 13/13 live checks pass (`scripts/ship-gap-test.ts`).

**Known-stale / candidate next steps:**
- Repo `supabase/migrations/` is behind Supabase's history (ship category, the 18-item seed,
  recipes 18–23, the re-chaining). Backfill if you need a reproducible-from-scratch DB.
- 5 live Carrack goals at re-chain time: 3 Volante own a Galleass (hull satisfied, no jump);
  2 Balance now correctly show the Caravel build path. Existing goals predate the current-ship
  picker, so users with no `current_stage_id` see the full hull path until they set one.

## Log

- **2026-06-22** — Completed the ships feature: verified the committed code (`f35d390`),
  confirmed live schema, applied the Carrack→hull re-chaining (user-approved), added
  `scripts/ship-gap-test.ts`. Prior session seeded the ship data and wrote the code.
