# Screenshot Import for Gathering Sessions

**Status:** Implemented (M1–M5 done 2026-06-21) — pending commit
**Last updated:** 2026-06-21

## Shipped pieces

- `lib/vision/phash.ts` — features (pHash + color), grade-ring detection, multi-offset
  matching, distance-scaled grade penalty.
- `lib/vision/segment.ts` — 5×7 grid, occupancy stats.
- `lib/vision/digits.ts` + `digit-templates.json` — fixed-font digit reader (0–9 baked).
- `lib/vision/scan.ts` — orchestrator (cached reference fingerprints from local icons →
  candidates with qty + confidence; meaningful skip count only).
- `app/api/inventory/session/scan/route.ts` — auth-gated POST, Node runtime.
- `app/components/session-gather.tsx` — "สแกนจากภาพ" button → upload → review lines
  with confidence badge + "N skipped" → existing batch save.
- Validation scripts in `scripts/` (calibrate, segment-test, digit-test, full-test,
  scan-test, build-digit-templates) + `scripts/grades.json`.

End-to-end on the real screenshot: 6 items + correct quantities, 1 not-in-system
skipped. White-grade (linen) matches; 4 diverse not-in-system items reject; digits 0–9
all read. Deploy-safe — `Dockerfile` copies `public/` so the runtime fs read resolves.



Let users photograph their in-game inventory at the end of a gathering run, have the
system read the items + quantities, and pre-fill the **Gathering Session** drawer for
review and one-tap save.

This is an *input method* for the existing session feature — it only fills the
`SessionGather` line list. The review-and-save flow is unchanged; nothing is ever
written to inventory without an explicit user confirm.

---

## Constraints (decided)

| Topic | Decision |
|---|---|
| Runtime | Pure Next/Node — no Python service, no hosted ML, no pgvector |
| Identity engine | Perceptual hash (pHash) against existing catalogue icons |
| Quantity reader | Fixed-font digit template matcher (not Tesseract) |
| Vision LLM | Not used — free, deterministic CV only |
| Unknown items | Skipped silently (with a "N not recognized" note) |
| New dependency | `sharp` only (pHash/DCT/digit-match are inline utils) |
| Reference art | Official PNG (transparent bg) from `items.image_url` |
| In-game art | JPG on black background, same source art |
| Capture | User screenshots, but an in-app alignment guide keeps geometry mostly consistent |

---

## Problem decomposition

| # | Sub-problem | Answers | Difficulty |
|---|---|---|---|
| 1 | Segmentation | Where are the occupied cells? | Medium (eased by the alignment guide) |
| 2 | Identity | Which item is in each cell → `item_id` or skip | **Hard — the core** |
| 3 | Quantity | What number is in the corner? | Easy (fixed font) |

The key asset: **every catalogue item already has an icon** (`items.image_url`). That
turns identity from "train a model to recognise game items" into "near-exact image
match against a known reference library."

---

## Calibration assets (in `docs/`)

Real in-game samples used to fix geometry and tune thresholds:

- `raw-session-input.png` — full inventory, a **5×7 grid** with three slot states
- `occupied-slot-{1,2,4,9,20}.png` — single-cell crops, filename = quantity
- `empty-slot.png`, `locked-slot.png` — the two non-item states

**Confirmed from the samples:**

- **Black background** behind every icon → validates the PNG→flatten-onto-black step.
- **Quantity** is white digits with a thin dark outline, fixed bottom-right corner,
  fixed font; 1–2 digits seen (1 … 20). Template matcher is sound.
- **Grade border = grade, independent of icon color** — e.g. the blue crystal and the
  dark stone both have *green* borders; red ore *orange*; gold nuggets *yellow*; blue
  gem *blue*. So the border ring is an orthogonal signal → promoted to a **primary**
  feature in the identity distance (not just a cross-check).
- **Uniform 5×7 geometry** → fixed-fraction segmentation; no contour detection needed.

**Three slot states** (segmentation must tell them apart):

| State | Appearance | Action |
|---|---|---|
| Occupied | saturated colored grade-border ring + icon | read it |
| Empty | flat dark, faint thin border, no saturation | skip |
| Locked | grey padlock glyph, no saturated border | skip |

**Risk seen:** the dark stone (×20) icon is mostly black with little structure —
pHash's weak case. Identity there leans on grade-border + color histogram and is the
most likely cell to need a manual fix in review. Expect it; don't be surprised by a
near-miss on low-detail dark icons.

---

## Spec A — Fingerprint normalization (one-time reference job)

For each `items` row with an `image_url`, produce a fingerprint that *looks like* an
in-game crop:

```
fetch PNG
→ sharp.trim()                      # drop transparent padding → content box
→ .flatten({ background: '#000' })  # composite transparency onto BLACK (matches in-game JPG)
→ .resize(32, 32, { fit: 'fill' })  # canonical square
→ .grayscale()
→ mask bottom-right corner to black # same region we ignore on capture (kills the number)
→ pHash (64-bit)                    # see below
→ color_sig                         # 8-bin hue histogram on the inner icon (pre-grayscale)
→ upsert into item_icon_fp(item_id, phash, color_sig, source_url)
```

**pHash (DCT-based):** 32×32 grayscale → 2D DCT → take the top-left 8×8 low-frequency
block (drop the DC term) → median of those 63 values → each bit = `coef > median ? 1 : 0`
→ 64-bit hash, stored as hex.

Notes:
- **Flattening onto black is the single most important step.** PNG transparency must be
  composited over black so the reference matches the in-game black-bg JPG. JPG
  compression noise does not bother pHash (low-frequency DCT).
- `source_url` lets backfill skip unchanged icons and recompute only when an image
  changes.
- Items with no `image_url` get no fingerprint → never match → always land in the
  "skipped" bucket. That is the desired unknown-handling, for free.

---

## Spec B — Scan route (per uploaded screenshot)

```
A. Grid geometry — known 5×7 grid; express margins / cell-pitch / gap as FRACTIONS of
   the framed region (resolution-independent):
     cell(r,c).x = mx + c*(cellW + gapX)
     cell(r,c).y = my + r*(cellH + gapY)

B. Occupancy — per cell: sample the BORDER RING and test for color saturation
   (max HSV-S of the ring > T_sat). Occupied = saturated colored ring;
   empty (flat dark) AND locked (grey padlock) both fail the test → skipped.
   NOTE: a plain content std-dev test does NOT work — the locked padlock is real
   content and would register as occupied. The border-saturation test is what cleanly
   separates item / empty / locked in one pass.

C. Identity — crop the INNER icon (inset ~12% to drop the grade frame)
   → normalize identically to Spec A (black bg, 32×32, gray, corner masked)
   → pHash → min Hamming distance over all fingerprints
   accept if  d_phash ≤ T1  AND ( color_sig dist ≤ T2  OR  border-grade matches )
   else → skip.
   confidence = (T1 − d_phash) / T1

D. Quantity — crop bottom-right corner → upscale 4× → binarize (white fill)
   → split glyphs by vertical projection → match each to 10 digit templates
   → concatenate.   no glyphs ⇒ qty 1.

E. Emit candidates:
     [{ item_id, name, image_url, qty, confidence, cropPreview }]
   + count of skipped occupied cells.
```

`T1`, `T2`, `T_occupied` are **empirical** — produced by calibration on real
screenshots, not by reasoning.

Output maps to the `SessionGather` `Line[]` model → existing review drawer → existing
batch-save endpoint (`POST /api/inventory/session`). The scan is only a line-filler.

---

## Gotchas (the real work)

1. **PNG-transparent → composite onto black** before fingerprinting (Spec A). Get this
   wrong and every match is off.
2. **Mask the number corner on both sides.** Capture has a burned-in digit; reference
   does not. Exclude that corner from the hash region on both.
3. **Crop inside the grade frame.** In-game cells have a colored rounded border; the
   reference PNG is the bare icon. Align the content boxes. Read the border color
   separately → grade, and cross-check against the matched item's grade (cheap, strong
   false-match filter).
4. **Near-identical material tiers** are the accuracy ceiling. Mitigate with a composite
   distance = pHash (shape) + color histogram (tint) + grade-border color. The
   confirm-before-save review UI catches the rest.
5. **Locked slots contain a padlock** — occupancy must key on border saturation, not
   content variance (see Spec B-A).
6. **Low-detail dark icons** (e.g. dark stone) carry little pHash signal — weight the
   color histogram + grade-border more heavily for those, and expect review fixes.

---

## Digit reader: template matcher vs Tesseract

| Approach | Verdict |
|---|---|
| Tesseract.js (WASM, digit whitelist) | Works but heavy dep, flaky on tiny game fonts |
| **Fixed-font template matcher** (10 glyph templates 0–9, segment string, match each) | **Chosen** — font never changes, tiny, deterministic, no WASM |

Templates are extracted once from a sample screenshot.

---

## Calibration result (M2 gate — PASSED 2026-06-21)

Measured on the 5 real in-game sample crops vs the 70 local catalogue PNGs, using
`composite = hamming/64 + 4·colorDist`, then a grade-border penalty of +0.5 for
mismatched grade. (`scripts/calibrate.ts`, `lib/vision/phash.ts`.)

- **Grayscale pHash alone is insufficient** — true-match distances (6–16) overlapped
  wrong matches; margins 0–4 bits.
- **+ color thumbnail (8×8 RGB)** — vivid icons separated; margins jumped to 0.15–0.31.
- **+ grade-border filter** — ring-grade detection was **5/5 correct**; margins for the
  four in-system items rose to **0.20–0.38** (confident), and the one out-of-catalogue
  item stayed high-score / low-margin (correctly rejectable).

| sample | ring grade | best match | score | margin |
|---|---|---|---|---|
| slot-2 | blue | brilliant-cobalt-ingot | 0.229 | 0.346 |
| slot-4 | green | deep-sea-plant-stalk | 0.143 | 0.306 |
| slot-9 | green | strong-ocean-iron | 0.234 | 0.376 |
| slot-20 | green | enhanced-island-tree-plywood | 0.265 | 0.195 |
| slot-1 | yellow | *(none confident)* | 0.507 | 0.066 | → skip (not in system) |

**Working thresholds:** accept if `score < 0.35` **and** `margin > 0.10`; else skip.
(Still needs user confirmation of ground-truth identities to lock these.)

---

## M3 result (segmentation + quantity — 2026-06-21)

Full pipeline run on `raw-session-input.png` (`scripts/segment-test.ts`,
`scripts/digit-test.ts`) reproduced the inventory exactly:

| cell | identity | qty |
|---|---|---|
| [0,0] | brilliant-cobalt-ingot | 2 |
| [0,1] | deep-sea-plant-stalk | 4 |
| [0,2] | shining-blue-lumberwood | 2 |
| [0,3] | scarlet-ore-of-the-deep-sea | 4 |
| [1,1] | *(skipped — gold, not in catalogue)* | 1 |
| [1,2] | enhanced-island-tree-plywood | 20 |
| [1,3] | strong-ocean-iron | 9 |

Refinements that landed:
- **Multi-offset matching** (`captureVariants`) — pHash isn't translation-invariant;
  uniform crops drifted a few px. Searching ±5% offsets recovered the alignment loss
  (blue gem 0.419 → 0.171).
- **Graded grade-penalty** — flat penalty wrongly rejected scarlet ore (ring read
  "orange", item is "yellow"). Penalty now scales with hue distance; adjacent grades
  cost little.
- **Occupancy** = inner std-dev gate, then the score/margin rule rejects locked/empty
  (a whole-cell locked template was unreliable — the blue gem scored closer to the
  padlock than an actual locked cell did).
- **Digit reader** — near-white threshold (198) + tight corner region rejects colored
  icon bleed; 7/7 quantities correct.

**Known data gaps (need user input, not code):**
- Digit templates cover only `{0,1,2,4,9}` (from the 5 samples). Need 1–2 more
  screenshots containing `3,5,6,7,8` to complete the set.
- All 7 sample items were colored-grade; the white-grade path (grade=null → rely on
  score/margin) is implemented but untested on real white-item data.

---

## Implementation roadmap

Ordered so each milestone is independently verifiable and the riskiest unknown is
settled early.

| # | Milestone | Deliverable / verification | Needs |
|---|---|---|---|
| 0 | Calibration assets | Extract 10 digit templates + fix grid fractions from the guide | **5–10 real screenshots** (varied items, some unknown, big stacks) |
| 1 | Fingerprint store + backfill | `item_icon_fp` table; every item hashed; same icon→~0 / different→large Hamming | — |
| 2 | **Matching core (GO/NO-GO gate)** | pure `normalize/pHash/hamming/match` utils tested on real crops; **T1/T2 measured** | M0 screenshots |
| 3 | Segmentation + quantity | full image → `[{item, qty}]` on sample set, accuracy measured | — |
| 4 | `POST /api/inventory/session/scan` | auth-gated route, size/type limits | — |
| 5 | Capture + review UI | "import screenshot" button + alignment frame in the drawer; pre-fills lines w/ confidence + crop-vs-icon thumbnails + "N skipped" | — |
| 6 | Hardening + ship | threshold re-tune, low-confidence styling, perf; version bump + tag | — |

**Pivotal gate = Milestone 2.** If pHash on real JPG captures matches the black-flattened
PNG references well, the rest is mechanical. If not, adjust there (weight the color
histogram heavier, or revisit) before investing in UI.

**Effort shape:** M1 small · **M2 medium (the meat)** · M3 medium · M4 small ·
M5 medium (UI) · M6 ongoing.

**Immediate next action:** collect a handful of real in-game inventory screenshots so
M0–M2 can produce a hard accuracy number before committing to the full build.

---

## Proposed schema (Milestone 1)

```sql
create table item_icon_fp (
  item_id    integer primary key references items(item_id) on delete cascade,
  phash      text    not null,   -- 64-bit hex
  color_sig  jsonb   not null,   -- 8-bin hue histogram
  source_url text    not null,   -- detect image changes
  updated_at timestamptz default now()
);
```

Backfill via an owner-only admin action that iterates `items` with an `image_url`,
normalizes, hashes, and upserts — skipping rows whose `source_url` is unchanged.
