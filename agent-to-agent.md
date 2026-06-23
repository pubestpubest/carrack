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

## CV inventory features (BUILT 2026-06-23, Alpha 0.21 — committed, not yet user-tested)

Both queued CV-adjacent features are now implemented. They reuse the vision pipeline (`lib/vision/*`,
`scanImage` + `loadReferences`); references build from local catalogue icons via `image_url`, so the
committed barter PNGs are matchable. CV plumbing: `POST app/api/inventory/session/scan/route.ts`
(scan), `app/api/inventory/session/route.ts` (apply, now takes a whitelisted `reason`),
`app/api/inventory/[itemId]/route.ts` (PUT = SET qty). `runtime = 'nodejs'` wherever `sharp` runs.

1. **Inventory Sync (full reconcile) — DONE.** `app/inventory/sync/page.tsx` (server, fetches all
   items + current qty) + `sync-client.tsx` (review UI). Upload screenshot → scan all categories →
   review screen (image left, detected list right, lowest-confidence first), each row
   `current → editable scanned` with a confidence badge + include checkbox. Apply PUTs `qty` per
   **included AND changed** row (`PUT /api/inventory/[itemId]`, SETs + logs delta `reason='manual
   update'`). Unseen items never get a PUT (not zeroed). Entry point: "ซิงค์จากภาพ" button on
   `/inventory`. NOTE: PUT still logs `'manual update'` — no distinct `'inventory sync'` reason yet.

2. **Barter Session (input/output) — DONE.** No clone: `session-gather.tsx` was **parameterized**
   with a `barter` prop; `layout.tsx` mounts `<SessionGather />` + `<SessionGather barter />` (teal
   FAB at `bottom-32`, gather at `bottom-16`). Barter mode filters catalogue to `category='barter'`,
   adds an Input/Output toggle (`out` state → `sign = barter && out ? -1 : 1`), and sends
   `reason='barter in'|'barter out'`. The session POST whitelists reasons
   (`'gathering session'|'barter in'|'barter out'`, default gather). Before→after, totals, and the
   local haveMap update all clamp via `Math.max(0, …)` and respect the sign. Non-barter scan hits
   auto-drop into the "skipped" note. Reference screenshot for sync source: `docs/raw-inventory-sync.png`.

## Current state (2026-06-23)

**Barter feature: items live in prod; scraper + assets committed; UI built (Barter Hold + session + sync).**
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
- **DONE since:** barter PNGs + `barter-items.json` + scraper are committed and live; barter UI
  shipped (Barter Hold page in Alpha 0.19–0.20, Barter session + Inventory Sync in Alpha 0.21).
- **STILL PENDING:**
  1. `weight`/Versatile-Tonnage was NOT scraped; add a nullable column later if cargo math is wanted.
  2. **SCANNER ACCURACY STILL NOT GOOD ENOUGH (user-confirmed 2026-06-24) — needs another tuning pass.**
     Alpha 0.23 lifted recall (28→52 on `docs/raw-inventory-sync.png`) but the user reports results
     are "not quite accurate." User confirmed **all four** modes present: wrong item/variant, wrong
     qty, missing, and false positives.
   - **Grid drift — FIXED in Alpha 0.24.** A brightness-projection scan found the real slot borders
     (cols ≈2,49,101,152,204,253,306,355,406,457) sat ~5px left of even-division by the right edge
     (rows ~3px), so crops clipped icons + qty digits. `gridRects` now fits the real borders
     (per-axis offset+pitch via `fitLines`/`projections` in `segment.ts`) instead of even-dividing;
     recovered clipped items (baseline 6→7 real, sync 52→55). Hand-specified grids (margins/gaps)
     still use uniform division.
   - **NOW THE #1 ISSUE — matcher "magnet" items.** The harness per-cell report shows the matcher
     collapsing many distinct icons onto a few catalogue entries: e.g. **"Weasel Leather Coat"
     matched to 6 different cells**, mostly tiny margins (m≈0.004–0.03). Main wrong-ID / false-positive
     source. This is **matcher quality** (`phash.ts` composite = phash + color + grade-ring), NOT
     thresholds or grid — likely needs a more discriminative descriptor or per-item normalization.
     Lesser suspects: qty OCR (`digits.ts`), occupancy (`innerStats` std<8 / `ITEM_BRIGHT`).
     Thresholds: `lib/vision/scan.ts` `ACCEPT_SCORE` 0.45 / `STRONG_SCORE` 0.38 / `ACCEPT_MARGIN` 0.04.
   - **HARNESS — use it, don't eyeball.** `scripts/scan-eval.ts` (env from `.env.local`) prints a
     per-cell report and scores precision/recall/qty vs `scripts/scan-truth.json`;
     `scripts/scan-montage.ts` crops every cell into one PNG for labeling. `scan.ts` now exports
     `scanCells` (per-cell detail; `scanImage` is a thin merge over it). **`scan-truth.json` is seeded
     from a scan and MUST be hand-corrected** (authoritative item names + quantities) before the
     precision/recall numbers mean anything — until then the score is self-referential (~100%).

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

- **2026-06-24** — Released **Alpha 0.24** (tag `v0.24`): **grid-snap + scanner eval harness**.
  (1) `gridRects` now fits the real slot borders (offset+pitch per axis via brightness projection,
  `fitLines`/`projections` in `segment.ts`) instead of even-dividing the image — fixes the ~5px
  edge drift that clipped icons/digits (baseline 6→7 real items, sync 52→55). (2) Refactored
  `scan.ts`: new `scanCells` returns per-cell detail; `scanImage` is a thin merge (external behavior
  unchanged). (3) Added harness: `scripts/scan-eval.ts` (per-cell report + precision/recall/qty vs
  `scripts/scan-truth.json`) and `scripts/scan-montage.ts` (cell montage for labeling). The eval
  surfaced the real accuracy problem: matcher **magnet items** (Weasel Leather Coat ×6) — a
  `phash.ts` matcher-quality issue, the next thing to fix. `scan-truth.json` is seeded and needs
  user correction. `tsc`/`build` clean.
- **2026-06-24** — Released **Alpha 0.23** (tag `v0.23`): **scanner recall + review order**.
  (1) The acceptance gate in `lib/vision/scan.ts` rejected a match if `margin <= ACCEPT_MARGIN`
  *even when the absolute score was excellent* (e.g. s=0.084 dropped because a sibling sat 0.09
  behind) — that alone halved recall. New score-aware rule: reject only if `s >= ACCEPT_SCORE
  (0.45)` **or** (`s >= STRONG_SCORE (0.38)` **and** `margin <= ACCEPT_MARGIN (0.04)`); a confident
  score bypasses the margin gate. Verified on the 9×10 test image: **52 unique items** (63 cells,
  merged across stacked slots) vs 28 before; baseline `raw-session-input.png` unchanged (6 correct).
  ponytail: recall favored over precision because the Sync/session screens let users deselect FPs
  but can't add misses (no manual-add). (2) Inventory Sync review list no longer re-sorts by
  confidence — `scanImage` returns row-major (image) order, so the list now lines up with the
  screenshot. NOTE: `next lint` is deprecated and drops to an interactive prompt; use `npm run build`
  (compiles + lints) as the gate.
- **2026-06-23** — Released **Alpha 0.22** (tag `v0.22`): **fixed the scanner grid**. `lib/vision`
  hardcoded `DEFAULT_GRID = 5×7`, so any inventory bigger than a small bag scanned to **0 items**
  (caught testing Inventory Sync on a real 9×10 screenshot). BDO keeps a fixed slot pitch (~51.5px)
  and grows the grid, so added `autoGrid(W,H)` in `segment.ts` (= `round(W/51.5) × round(H/51.5)`);
  `gridRects`/`scanImage` now auto-detect when no spec is passed. Verified: 462×522→9×10 (28 matches,
  conf 0.67–0.89), 258×357→5×7 (baseline unchanged). Guard: `scripts/autogrid-test.ts`. ponytail
  ceiling noted in code: constant pitch assumes the documented capture scale — detect pitch from
  inter-slot gaps if users capture at varying UI scale/DPI.
- **2026-06-23** — Released **Alpha 0.21** (tag `v0.21`): two CV inventory features. (1) **Barter
  session** — parameterized `session-gather.tsx` with a `barter` prop (no clone); `layout.tsx`
  mounts a second `<SessionGather barter />` (teal FAB, `bottom-32`). Barter-only catalogue +
  Input/Output toggle (`sign = barter && out ? -1 : 1`); `session/route.ts` now whitelists the audit
  `reason` (`barter in`/`barter out`/`gathering session`). (2) **Inventory Sync** — new
  `/inventory/sync` (`page.tsx` + `sync-client.tsx`): upload screenshot → scan all → review
  (current→scanned, editable/deselectable) → PUT per changed row (SET, unseen untouched); linked
  from `/inventory`. `tsc`/`lint`/`build` clean. Not yet tested on a real screenshot.
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
