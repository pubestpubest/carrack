import { autoGrid } from '../lib/vision/segment'
import assert from 'node:assert'

// Guards the grid auto-detection: a fixed slot pitch must recover the real
// rows/cols from the capture size (the 5×7 hardcode silently broke 9×10 captures).
const cases: [number, number, number, number][] = [
  [258, 357, 5, 7],   // docs/raw-session-input.png — small bag
  [462, 522, 9, 10],  // docs/raw-inventory-sync.png — full inventory
]
for (const [w, h, cols, rows] of cases) {
  const g = autoGrid(w, h)
  assert.deepStrictEqual([g.cols, g.rows], [cols, rows], `autoGrid(${w},${h})`)
}
console.log('autogrid-test: ok')
