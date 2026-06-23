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
- **Supabase MCP can be unreachable** ("connector isn't responding"). Fallback for read-only
  catalogue checks: query the REST API directly —
  `curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/items?select=grade" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"`
  (load both from `.env.local`). Distinct values reveal what the CHECKs de-facto allow without
  needing `pg_constraint`. Can't do DDL this way — `apply_migration` still needs the MCP.

## How to verify gap-analysis work

- `npm run lint` and `npx tsc --noEmit` (after `npm ci`).
- `export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/ship-gap-test.ts` — runs the
  pure engine against the **live catalogue** and asserts hull-chain expansion, `stopAtItemId`
  truncation, and the Carrack→hull requirement. Extend it whenever you touch
  `lib/gap-analysis.ts`.

## Planned features (requested 2026-06-23 — NOT built yet)

Two CV-adjacent inventory features are queued. Both reuse the vision pipeline (`lib/vision/*`,
`scanImage` + `loadReferences`); references are built from local catalogue icons via each item's
`image_url`, so the now-committed barter PNGs are matchable. Existing CV plumbing:
`POST app/api/inventory/session/scan/route.ts` (scan), `app/api/inventory/session/route.ts`
(apply), `app/components/session-gather.tsx` (the floating quick-record UI). `runtime = 'nodejs'`
is required wherever `sharp` runs.

1. **Inventory Sync (full reconcile from a screenshot) — REPLACE-wise, NEW layout.**
   - Upload a BDO inventory screenshot → scan reads item + qty → match against **all** catalogue
     items (every category) → the read quantities **overwrite** `user_inventory.qty_have` (SET, not
     ADD). Items NOT seen in the image are left untouched — do NOT zero them.
   - Distinct from the existing gather session (which ADDS a delta). Build a **different, dedicated
     layout**: a review screen showing the uploaded image beside the detected list (with
     confidence), each row showing `current → scanned`, editable/deselectable before applying.
   - Reuse the scan endpoint for detection; apply via `PUT /api/inventory/[itemId]` per item — that
     route already SETS `qty` (= replace) and logs the audit delta. Let users correct mismatches
     before writing; mind `ACCEPT_SCORE`/`ACCEPT_MARGIN` tuning in `lib/vision/scan.ts`.
   - Reference screenshot for the intended source/layout: `docs/raw-inventory-sync.png`.

2. **Barter Session (input / output mode) — SAME layout as the gather session, barter-only.**
   - Clone the floating quick-record flow (`session-gather.tsx` + `/api/inventory/session*`) but
     scope the searchable items to `category='barter'` only.
   - Add a **mode toggle: Input vs Output** — Output just inverts the sign (negative delta = loaded
     onto ship / bartered away; Input = acquired). Deltas clamp at 0 via the `qty_have >= 0` CHECK;
     record the mode in the audit `reason` (e.g. `'barter in'` / `'barter out'`).
   - Only the item filter + the +/- sign differ from today's session; keep the UI identical.

## Current state (2026-06-23)

**Barter feature: items SEEDED to prod (2026-06-23); scraper + assets NOT committed; UI not built.**
- New scraper `scripts/scrape-barter-items.mjs`: iterates bdocodex item IDs, pulls name/name_th
  from EN+TH `og:title`, grade from the `grade_frame_N` class, barter level from the `[Level N]`
  prefix, icon from `og:image`. `--images` downloads + converts webp→png via `sharp` into
  `public/images/barter/<id>.png`. Raw HTML cached in `scripts/cache/` (now git-ignored).
  Output **replaces** (not appends) `barter-items.json`.
- Scraped ranges **800001–800070 + 800201–800248** → `barter-items.json` (118 items, 0 missing)
  + 118 PNGs. Grade spread: 14 white / 14 green / 14 blue / 14 yellow / 62 orange. Level→grade is
  consistent (Lv1 white … Lv5–7 orange).
- **Planned model (decided, not yet applied): fold barter into `items`, `category='barter'`** —
  reuses `user_inventory`/`inventory_log`/`trade_exchanges`/scanner/gap-analysis for free. Map
  scrape `level`→`items.tier`; `crow_coin_price`=NULL. Use the **real BDO id (800001+) as `item_id`**.
- **Live schema verified 2026-06-23 (anon REST — MCP was down):** prod `items.grade` already allows
  all 6 grades (white/green/blue/yellow/orange/red present), so **no grade CHECK change**. `category`
  has license/equipment/material/ship/currency → **needs `'barter'` added** to the CHECK (one ALTER).
  `max(item_id)=103` → 800001+ is collision-free. `trade_exchanges.tier_required` is `BETWEEN 1 AND 5`
  but barter goes to **Lv7** — widen it only when modeling barter *routes* (not needed for the item seed).
- **DONE:** migration `add_barter_items` applied to prod (`astqacmwpicgwplptcoi`) — widened the
  `items_category_check` to include `'barter'` + upserted all 118 (`ON CONFLICT (item_id) DO UPDATE`,
  re-runnable). Verified: 118 rows, 0 missing th/img, grades 14/14/14/14/62, ids 800001–800248.
  No `database.ts` regen needed (`category` is typed `string`).
- **STILL PENDING:**
  1. `public/images/barter/*.png` (118) + `barter-items.json` + the scraper are **uncommitted** —
     the seeded `image_url`s (`/images/barter/<id>.png`) will **404 in prod until pushed** (assets
     ship in the Docker image's `public/`). Push to deploy them.
  2. Build the barter inventory UI — user wants **session input/output with the CV scanner** (reuse
     `lib/vision/*`). Note the scanner builds references from local catalogue icons, so the new
     barter PNGs must be present for it to recognize them.
  3. `weight`/Versatile-Tonnage was NOT scraped; add a nullable column later if cargo math is wanted.

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

- **2026-06-23** — Barter items SEEDED: wrote `scripts/scrape-barter-items.mjs`, scraped
  800001–800070 & 800201–800248 (118 items + images), and applied migration `add_barter_items`
  to prod (user-approved) — widened `items_category_check` to add `'barter'` + upserted 118 rows
  (`category='barter'`, `tier`=barter level, `image_url=/images/barter/<id>.png`, `crow_coin_price`
  NULL). Verified. Scraper + JSON + PNGs still uncommitted; images 404 in prod until pushed. Next:
  barter inventory UI with the CV scanner.
- **2026-06-23** — Released **Alpha 0.18** (tag `v0.18`): added `app/icon.svg` favicon (brass
  anchor on navy chart-grid tile; Next App Router auto-wires it).
- **2026-06-23** — Released **Alpha 0.17** (tag `v0.17`): (1) fixed the dashboard `goalVariant`
  in `app/page.tsx` — it only matched the 4 Carrack names, so a hull-ship goal (Sailboat/Frigate/
  Caravel/Galleass) rendered "No active goal"; extended the name→node map (`ShipTree`'s
  `VARIANT_TO_NODE` already supported them). (2) Goals page redesign: active goal is now a large
  hero card (`GoalHero` in `app/goals/goals-list.tsx`), paused goals stay compact rows; widened
  page to `max-w-4xl`, rethemed header to brass; added `hero-rise`/`sheen` keyframes to `globals.css`.
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
