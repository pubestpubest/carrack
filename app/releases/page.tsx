import Link from 'next/link'
import { RELEASES } from '@/lib/releases'

export const metadata = { title: 'Release Notes · Carrack Tracker' }

const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function ReleasesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="mb-1 text-xs font-display uppercase tracking-[0.25em]" style={{ color: 'rgba(200,168,75,0.5)' }}>
          Ship&rsquo;s Log
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-wider" style={{ color: 'var(--brass-light)' }}>
          Release Notes
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#7a7464' }}>
          Every version of Carrack Tracker, newest first.
        </p>
      </div>

      {/* Timeline */}
      <ol className="relative border-l" style={{ borderColor: 'rgba(200,168,75,0.18)' }}>
        {RELEASES.map((r, i) => (
          <li key={r.version} className="relative mb-9 pl-7 last:mb-0">
            {/* Node */}
            <span
              className="absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full"
              style={{
                background: i === 0 ? 'var(--brass-light)' : 'var(--ink-raised)',
                border: '1px solid rgba(200,168,75,0.5)',
                boxShadow: i === 0 ? '0 0 10px rgba(226,201,126,0.5)' : 'none',
              }}
              aria-hidden
            />

            <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(200,168,75,0.15)', backgroundColor: 'var(--ink-surface)' }}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-lg font-semibold tracking-wider" style={{ color: 'var(--brass-light)' }}>
                  {r.version}
                </h2>
                {i === 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: 'rgba(200,168,75,0.15)', color: 'var(--brass-light)' }}>
                    Latest
                  </span>
                )}
                <time className="ml-auto text-xs tabular-nums" style={{ color: '#6b7a8d' }}>
                  {DATE_FMT.format(new Date(r.date))}
                </time>
              </div>

              <p className="mb-3 text-sm font-medium text-[#c8c3b4]">{r.title}</p>

              <ul className="space-y-1.5">
                {r.notes.map((note, j) => (
                  <li key={j} className="flex gap-2 text-sm leading-relaxed text-[#8a93a3]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: 'rgba(200,168,75,0.5)' }} aria-hidden />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 text-center">
        <Link href="/" className="text-xs font-display uppercase tracking-widest text-[#6b7a8d] transition-colors hover:text-[#a0b4cc]">
          ← Back to deck
        </Link>
      </div>
    </div>
  )
}
