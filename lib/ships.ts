// Maps a current-ship stage variant to the catalogue item name of that hull.
// Used to stop the gap-analysis chain at a ship the user already owns.
export const VARIANT_HULL: Record<string, string> = {
  none:              'Batali Sailboat',
  sailboat:          'Epheria Sailboat',
  frigate:           'Epheria Frigate',
  sailboat_modified: 'Epheria Sailboat (Modified)',
  frigate_modified:  'Epheria Frigate (Modified)',
  caravel:           'Epheria Caravel',
  galleass:          'Epheria Galleass',
}
