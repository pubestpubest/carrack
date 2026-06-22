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

> Releases: add an entry atop `lib/releases.ts` **and** cut a matching git tag (`v0.x`); the
> footer + `/releases` follow `CURRENT` automatically. `package.json` version is left at `0.1.0`.

## Log

- **2026-06-22** — Released **Alpha 0.16** (tag `v0.16`): gated the onboarding `Tutorial`
  (mounted globally in `app/layout.tsx`) on auth — it was popping up on `/auth/*` for logged-out
  visitors. Uses `supabase.auth.onAuthStateChange` (not a one-shot `getUser`) because the root
  layout persists across the login→dashboard client nav, so a fresh login must flip `authed`
  in-place to trigger the tour. `?` re-trigger button also hidden when signed out.
- **2026-06-22** — Released **Alpha 0.15** (tag `v0.15`): corrected the ship build path — T3 ships
  build DIRECTLY from the base hull (migration `t3_ships_build_from_base_hull`: recipe 22 ship
  ingredient 89→87 Caravel←Sailboat, recipe 23 90→88 Galleass←Frigate). The "(Modified)" ships
  (T2.5) are an OPTIONAL side-branch, NOT required for a T3/Carrack — so `allowedCurrentVariants`
  no longer offers them as start points (reverting the misdiagnosed Alpha 0.13 addition). The
  Alpha 0.13 modified `ship_stages` (10/11) + items remain as optional ships; 0 goals reference them.
  Lesson: the build path is T1→T2→T3→T4 with an optional T2→T2.5→T3; trust the user's progression
  table over the doc's prose. `scripts/ship-gap-test.ts` rewritten for the direct model (14 checks).
- **2026-06-22** — Released **Alpha 0.14** (tag `v0.14`): `/goals` is now a management list of
  ALL goals (active + paused, both types) via `app/goals/goals-list.tsx`; added `PATCH /api/goals/[id]`
  enforcing one active goal per type (ship = `current_stage_id` not null) — activating/creating
  auto-pauses the same-type active goal. Create flow + goal-detail `GoalActions` route through PATCH.
  Extracted the duplicated `VARIANT_HULL` map to `lib/ships.ts` (was in goal-detail + dashboard).
  Tutorial gained a manage-goals step; `STORAGE_KEY` bumped to `v4` so the tour re-shows. No DB change.
  NOTE: pre-existing data may violate the one-active invariant (one user had 2 active ship + 2 active
  equip); not auto-normalized — resolves as the user activates/pauses. Offer to normalize if asked.
- **2026-06-22** — Released **Alpha 0.13** (tag `v0.13`): added Modified Sailboat/Frigate as
  `ship_stages` (migration `add_modified_ship_stages`, variants `sailboat_modified`/`frigate_modified`)
  so they're selectable "current ship" start points; `allowedCurrentVariants` + both `VARIANT_HULL`
  maps updated; picker ordered by `VARIANT_RANK`. Note: the modified ships are intermediate crafts,
  so starting from a *plain* frigate still (correctly) lists Modified Frigate as needed.
- **2026-06-22** — Released **Alpha 0.12** (tag `v0.12`): moved the 4 Carrack vessels (81–84)
  `equipment`→`ship` (migration `carracks_to_ship_category`); added a Ships section to inventory;
  catalogue sections now sort by grade. goal-new now fetches ship targets in one
  `category='ship' tier>=2` query (Carracks included), dropping the by-name Carrack query.
- **2026-06-22** — Released **Alpha 0.11** (tag `v0.11`): ships feature changelog entry.
- **2026-06-22** — Completed the ships feature: verified the committed code (`f35d390`),
  confirmed live schema, applied the Carrack→hull re-chaining (user-approved), added
  `scripts/ship-gap-test.ts`. Prior session seeded the ship data and wrote the code.
