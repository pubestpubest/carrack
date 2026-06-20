import type { Metadata } from 'next'
import { Cinzel, Spectral, Niramit } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'
import Tutorial from '@/app/components/tutorial'

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
        <footer className="mt-8 border-t border-gray-800/60 py-4 text-center text-xs text-gray-700 tracking-widest uppercase">
          Carrack Tracker&ensp;·&ensp;Alpha 0.4
        </footer>
        <Tutorial />
      </body>
    </html>
  )
}
