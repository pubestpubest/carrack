// Release history — newest first. The footer shows CURRENT.version and links to
// /releases, which renders this list. Add an entry here on each release (that also
// bumps the footer automatically — no need to touch layout.tsx).

export type Release = {
  version: string   // e.g. "Alpha 0.10"
  tag:     string   // git tag, e.g. "v0.10"
  date:    string   // ISO date
  title:   string
  notes:   string[]
}

export const RELEASES: Release[] = [
  {
    version: 'Alpha 0.24',
    tag:     'v0.24',
    date:    '2026-06-24',
    title:   'Scanner locks onto your inventory grid',
    notes: [
      'The screenshot scanner now finds the real slot boundaries in your capture instead of assuming the grid fills the image edge-to-edge. Previously a few pixels of drift clipped icons and stack numbers near the edges; now each slot is read cleanly, recovering items that were being cut off.',
    ],
  },
  {
    version: 'Alpha 0.23',
    tag:     'v0.23',
    date:    '2026-06-24',
    title:   'Scanner catches more items · review list matches your screenshot',
    notes: [
      'The screenshot scanner was throwing away confident matches whenever a similar-looking item sat close behind, so a full inventory came back with only a fraction of its goods. It now keeps strong matches — on a test inventory it found ~52 items instead of 28.',
      'The Inventory Sync review list now follows the same top-to-bottom, left-to-right order as your screenshot, so it lines up for easy side-by-side checking instead of being shuffled by confidence.',
    ],
  },
  {
    version: 'Alpha 0.22',
    tag:     'v0.22',
    date:    '2026-06-23',
    title:   'Screenshot scanner now reads full-size inventories',
    notes: [
      'Fixed the inventory scanner (used by Inventory Sync and the gathering/barter sessions): it assumed a fixed 5×7 grid, so anything but a small bag came back empty. It now detects the grid size from the screenshot, reading full inventories — a 9×10 capture now finds dozens of items instead of none.',
    ],
  },
  {
    version: 'Alpha 0.21',
    tag:     'v0.21',
    date:    '2026-06-23',
    title:   'Barter sessions & sync your whole inventory from a screenshot',
    notes: [
      'New Barter session button (teal, bottom-right): quick-record bartering with an Input / Output toggle — Input adds what you received, Output subtracts what you loaded onto the ship or sold. Search barter goods or scan a screenshot, same as the gathering session.',
      'New Inventory Sync: upload one inventory screenshot and the scanner reads every item, then shows a review screen (image beside the detected list) with current → scanned for each — edit or untick any row, then overwrite your inventory in one go. Items not in the image are left untouched.',
      'Reach Inventory Sync from the new “ซิงค์จากภาพ” button on the Inventory page.',
    ],
  },
  {
    version: 'Alpha 0.20',
    tag:     'v0.20',
    date:    '2026-06-23',
    title:   'Barter Hold — stock health & tidier crates',
    notes: [
      'Set a stock-health target per tier: goods below your “red” number show red (restock), below “green” show yellow, and at or above show green — fully configurable per tier from the new ⚙ Thresholds panel.',
      'Each tier shelf now sorts by quantity owned (most stocked first) and shows a green/yellow/red health tally.',
      'Tightened the item cards so the icons render sharp instead of upscaled.',
    ],
  },
  {
    version: 'Alpha 0.19',
    tag:     'v0.19',
    date:    '2026-06-23',
    title:   'Barter Hold — track your sea-trade goods',
    notes: [
      'New Barter Hold page: track your bartering trade goods, racked into tier shelves (Tier I–VII) and colored by grade, with held cargo highlighted and a quick − / + stepper to update quantities.',
      'Added 118 barter trade items (Thai + English names, grades, icons) to the catalogue.',
      'New brass “Barter” entry in the navbar — and the whole navbar got a size bump for easier reading.',
    ],
  },
  {
    version: 'Alpha 0.18',
    tag:     'v0.18',
    date:    '2026-06-23',
    title:   'A proper anchor in your browser tab',
    notes: [
      'Added a favicon — a brass anchor on a navy chart-grid tile — so the tracker now has its own mark in browser tabs and bookmarks instead of the blank default.',
    ],
  },
  {
    version: 'Alpha 0.17',
    tag:     'v0.17',
    date:    '2026-06-23',
    title:   'Dashboard reads ship goals · Goals page redesign',
    notes: [
      'Fixed the dashboard showing “No active goal” when your active goal was a hull ship (Sailboat, Frigate, Caravel, or Galleass) — it now recognizes every ship goal, not just the four Carracks, and lights up the matching node on the progression tree.',
      'Redesigned the Goals page: your active goal now stands out as a large hero card — bigger portrait, oversized progress, and full-size actions — while paused goals stay as compact rows. Less wasted space, clearer focus.',
    ],
  },
  {
    version: 'Alpha 0.16',
    tag:     'v0.16',
    date:    '2026-06-22',
    title:   'Tutorial only for signed-in users',
    notes: [
      'The onboarding tour no longer pops up on the login/register screens — it now starts only after you sign in, and kicks off automatically for new accounts.',
    ],
  },
  {
    version: 'Alpha 0.15',
    tag:     'v0.15',
    date:    '2026-06-22',
    title:   'Direct ship upgrade path',
    notes: [
      'Fixed the upgrade path: a Caravel is built directly from an Epheria Sailboat and a Galleass directly from an Epheria Frigate — no longer forcing the optional "Modified" ships as a required step.',
      'So when you start a Galleass goal from a Frigate you already own, it no longer asks you to build a Modified Frigate first.',
    ],
  },
  {
    version: 'Alpha 0.14',
    tag:     'v0.14',
    date:    '2026-06-22',
    title:   'Manage multiple goals',
    notes: [
      'The Goals page is now a manager for all your goals — ship and equipment, active and paused — each with progress, plus pause/resume and delete.',
      'One ship goal and one equipment goal stay active at a time; activating or creating another automatically pauses the previous one of that type.',
      'Tutorial updated to cover managing goals.',
    ],
  },
  {
    version: 'Alpha 0.13',
    tag:     'v0.13',
    date:    '2026-06-22',
    title:   'Start from a modified ship',
    notes: [
      'You can now pick a Modified Sailboat or Modified Frigate as your current ship when setting a ship goal — no more being told to build a ship you already own.',
      'Current-ship choices are now ordered along the build path (base → modified → upgraded).',
    ],
  },
  {
    version: 'Alpha 0.12',
    tag:     'v0.12',
    date:    '2026-06-22',
    title:   'Ships get their own section',
    notes: [
      'Carracks and hull ships now live under a dedicated “Ships” section in the catalogue and inventory, instead of being mixed in with equipment.',
      'Every catalogue section is now sorted by grade.',
    ],
  },
  {
    version: 'Alpha 0.11',
    tag:     'v0.11',
    date:    '2026-06-22',
    title:   'Track any ship — full hull progression',
    notes: [
      'Set any ship as your goal — Sailboat, Frigate, Caravel, or Galleass — not just the four Carracks.',
      'The tracker expands the whole build chain down to raw materials, and a Carrack now correctly requires building its base hull (Caravel or Galleass).',
      'Tell it which ship you already own and the chain stops there, so you only see what’s still left to gather.',
      'New “ship” filter in the catalogue.',
    ],
  },
  {
    version: 'Alpha 0.10',
    tag:     'v0.10',
    date:    '2026-06-22',
    title:   'Sharper screenshot recognition',
    notes: [
      'Border-grade detection now decided by a per-pixel majority vote instead of an averaged hue, so vivid/glowing icons (e.g. Cox Pirate Insignia) are read correctly.',
      'Tighter ring sampling so an item’s glow no longer bleeds into its grade frame.',
    ],
  },
  {
    version: 'Alpha 0.9',
    tag:     'v0.9',
    date:    '2026-06-21',
    title:   'Tutorial demonstrates the scan',
    notes: [
      'The onboarding tour now shows a sample inventory screenshot to demonstrate image import — no upload required to learn it.',
    ],
  },
  {
    version: 'Alpha 0.8',
    tag:     'v0.8',
    date:    '2026-06-21',
    title:   'Screenshot import for gathering sessions',
    notes: [
      'Scan an inventory screenshot to auto-fill a gathering session — recognizes items and quantities, skips anything not in the catalogue.',
      'Review the detected items (with confidence) against the source image before saving.',
      'Added a tutorial step covering the new scan feature.',
    ],
  },
  {
    version: 'Alpha 0.7',
    tag:     'v0.7',
    date:    '2026-06-21',
    title:   'Quick gathering sessions',
    notes: [
      'New floating button to quick-record items gathered in a play session: search, adjust quantities, see before → after, and save in one step.',
    ],
  },
  {
    version: 'Alpha 0.6',
    tag:     'v0.6',
    date:    '2026-06-21',
    title:   'Goal creation polish',
    notes: [
      'Swapped the Volante and Valor card order in goal creation for a more natural reading order.',
    ],
  },
  {
    version: 'Alpha 0.5',
    tag:     'v0.5',
    date:    '2026-06-20',
    title:   'Tutorial & goal fixes',
    notes: [
      'Tutorial tooltip no longer covers the Start Tracking button.',
      'Removed the Ravina daily-quest checkbox from goal creation.',
    ],
  },
  {
    version: 'Alpha 0.4',
    tag:     'v0.4',
    date:    '2026-06-20',
    title:   'Admin & catalogue depth',
    notes: [
      'Admin panel for editing items.',
      'Enriched catalogue detail pages, inventory sorting, and an owner-only nav tab.',
    ],
  },
  {
    version: 'Alpha 0.3',
    tag:     'v0.3',
    date:    '2026-06-20',
    title:   'Layout refinements',
    notes: [
      'Licenses shown in a full-width two-column layout; wider inventory cards.',
    ],
  },
  {
    version: 'Alpha 0.1–0.2',
    tag:     '',
    date:    '2026-06-20',
    title:   'Initial release',
    notes: [
      'Core expedition tracker: ship progression tree, goals, inventory, and catalogue.',
      'Thai localization (Niramit), nautical theme, Docker + CI/CD deployment.',
    ],
  },
]

export const CURRENT = RELEASES[0]
