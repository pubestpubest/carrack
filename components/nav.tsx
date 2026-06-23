'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const OWNER_EMAIL = 'pubest12@gmail.com'

const links = [
  { href: '/',          label: 'Dashboard', tour: ''              },
  { href: '/goals',     label: 'Goals',     tour: 'nav-goals'     },
  { href: '/inventory', label: 'Inventory', tour: 'nav-inventory' },
  { href: '/catalogue', label: 'Catalogue', tour: 'nav-catalogue' },
]

// Barter exchange (swap arrows) glyph — signals the trade-goods hold.
function SwapIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h12.5" /><path d="M13.5 5l3 3-3 3" />
      <path d="M20 16H7.5" /><path d="M10.5 13l-3 3 3 3" />
    </svg>
  )
}

export default function Nav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsOwner(user?.email === OWNER_EMAIL)
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const barterActive = pathname.startsWith('/barter')

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(6, 10, 18, 0.92)',
        borderBottom: '1px solid rgba(200, 168, 75, 0.15)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-3.5">

        {/* Brand — Cinzel nameplate */}
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{
              background: 'radial-gradient(circle, rgba(200,168,75,0.18) 0%, transparent 70%)',
              border: '1px solid rgba(200,168,75,0.35)',
              color: '#e2c97e',
            }}
            aria-hidden
          >
            ⚓
          </span>
          <span
            className="font-display text-xl font-semibold tracking-[0.2em]"
            style={{ color: '#e2c97e' }}
          >
            CARRACK
          </span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'rgba(200, 168, 75, 0.2)' }} />

        {/* Nav links */}
        <div className="flex flex-1 gap-1">
          {links.map(({ href, label, tour }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                {...(tour ? { 'data-tour': tour } : {})}
                className={[
                  'font-display rounded-lg px-4 py-2.5 text-sm font-semibold tracking-widest transition-all duration-200',
                  isActive
                    ? 'text-[#e2c97e] bg-[rgba(200,168,75,0.1)] shadow-[inset_0_0_0_1px_rgba(200,168,75,0.3)]'
                    : 'text-[#6b7a8d] hover:text-[#a0b4cc]',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
          {isOwner && (
            <Link
              href="/admin"
              className={[
                'font-display rounded-lg px-4 py-2.5 text-sm font-semibold tracking-widest transition-all duration-200',
                pathname.startsWith('/admin')
                  ? 'text-rose-300 bg-rose-950/40 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)]'
                  : 'text-rose-800 hover:text-rose-500',
              ].join(' ')}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Barter Hold — standout brass entry, sat next to Sign out */}
        <Link
          href="/barter"
          data-tour="nav-barter"
          className="group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 font-display text-sm font-semibold tracking-widest transition-all duration-200"
          style={
            barterActive
              ? { background: 'linear-gradient(135deg, #e2c97e 0%, #c8a84b 55%, #9a7d34 100%)', color: '#060a12', boxShadow: '0 2px 14px rgba(200,168,75,0.30)' }
              : { color: '#e2c97e', border: '1px solid rgba(200,168,75,0.45)', background: 'radial-gradient(120% 140% at 50% -20%, rgba(200,168,75,0.16), transparent 70%)' }
          }
        >
          {!barterActive && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'radial-gradient(120% 140% at 50% -20%, rgba(200,168,75,0.22), transparent 70%)' }}
            />
          )}
          <span className="relative"><SwapIcon /></span>
          <span className="relative">Barter</span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'rgba(200, 168, 75, 0.2)' }} />

        {/* Sign out */}
        <button
          onClick={signOut}
          className="shrink-0 rounded-lg px-4 py-2.5 text-sm tracking-wide transition-colors text-[#4a5568] hover:text-[#9ca3af]"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
