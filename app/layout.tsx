import type { Metadata } from 'next'
import { Cinzel, Spectral } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'

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
    <html lang="en" className={`${cinzel.variable} ${spectral.variable}`}>
      <body className={`${spectral.className} antialiased`}>
        <Nav />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
