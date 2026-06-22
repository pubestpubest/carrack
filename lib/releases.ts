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
