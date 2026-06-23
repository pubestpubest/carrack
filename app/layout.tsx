import type { Metadata } from 'next'
import { Cinzel, Spectral, Niramit } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import Nav from '@/components/nav'
import Tutorial from '@/app/components/tutorial'
import SessionGather from '@/app/components/session-gather'
import { CURRENT } from '@/lib/releases'

const cinzel = Cinzel({
  subsets:  ['latin'],
  variable: '--font-cinzel',
  weight:   ['400', '600', '700'],
  display:  'swap',
})

const spectral = Spectral({
  subsets:  ['latin'],
  variable: '--font-spectral',
  weight:   ['300', '400', '600'],
  style:    ['normal', 'italic'],
  display:  'swap',
})

const niramit = Niramit({
  subsets:  ['thai', 'latin'],
  variable: '--font-niramit',
  weight:   ['300', '400', '500', '600', '700'],
  display:  'swap',
})

export const metadata: Metadata = {
  title: 'Carrack Tracker',
  description: 'BDO Epheria Carrack crafting progress tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${spectral.variable} ${niramit.variable}`}>
      <body className={`${spectral.className} antialiased flex flex-col min-h-screen`}>
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="mt-12 border-t" style={{ borderColor: 'rgba(200,168,75,0.12)' }}>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row">
            <span className="flex items-center gap-2 font-display uppercase tracking-widest text-[#5a6678]">
              <span aria-hidden>⚓</span> Carrack Tracker
            </span>
            <Link
              href="/releases"
              className="group inline-flex items-center gap-1.5 font-display uppercase tracking-widest text-[#5a6678] transition-colors hover:text-[var(--brass-light)]"
            >
              <span>{CURRENT.version}</span>
              <span className="opacity-50 transition-opacity group-hover:opacity-100">· release notes →</span>
            </Link>
          </div>
        </footer>
        <SessionGather />
        <SessionGather barter />
        <Tutorial />
      </body>
    </html>
  )
}
