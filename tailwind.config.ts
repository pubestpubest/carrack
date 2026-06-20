import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  safelist: [
    'grade-white',  'grade-green',  'grade-blue',  'grade-yellow',  'grade-orange',  'grade-red',
    'grade-frame-white', 'grade-frame-green', 'grade-frame-blue',
    'grade-frame-yellow', 'grade-frame-orange', 'grade-frame-red',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-cinzel)', 'Georgia', 'serif'],
        body:    ['var(--font-spectral)', 'Georgia', 'serif'],
      },
      colors: {
        brass: {
          DEFAULT: '#c8a84b',
          light:   '#e2c97e',
          muted:   '#8a7030',
        },
        ink: {
          deep:    '#060a12',
          navy:    '#0b1220',
          surface: '#111d30',
          raised:  '#182540',
        },
        // BDO grade colors (keep original names for .grade-* classes)
        grade: {
          white: '#ffffff',
          green: '#4ade80',
          blue:  '#60a5fa',
        },
      },
      backgroundImage: {
        'chart-grid': `
          linear-gradient(rgba(200, 168, 75, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(200, 168, 75, 0.04) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'chart': '48px 48px',
      },
    },
  },
  plugins: [],
}

export default config
