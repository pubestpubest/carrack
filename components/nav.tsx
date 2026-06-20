'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/',          label: 'Dashboard' },
  { href: '/goals',     label: 'Goals'     },
  { href: '/inventory', label: 'Inventory' },
  { href: '/catalogue', label: 'Catalogue' },
]

export default function Nav() {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(6, 10, 18, 0.92)',
        borderBottom: '1px solid rgba(200, 168, 75, 0.15)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">

        {/* Brand — Cinzel nameplate */}
        <Link href="/" className="mr-3 flex shrink-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
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
            className="font-display text-base font-semibold tracking-widest"
            style={{ color: '#e2c97e' }}
          >
            CARRACK
          </span>
        </Link>

        {/* Divider */}
        <div
          className="h-4 w-px shrink-0"
          style={{ backgroundColor: 'rgba(200, 168, 75, 0.2)' }}
        />

        {/* Nav links */}
        <div className="flex flex-1 gap-0.5">
          {links.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'font-display rounded-md px-3 py-1.5 text-xs font-semibold tracking-widest transition-all duration-200',
                  isActive
                    ? 'text-[#e2c97e] bg-[rgba(200,168,75,0.1)] shadow-[inset_0_0_0_1px_rgba(200,168,75,0.3)]'
                    : 'text-[#6b7a8d] hover:text-[#a0b4cc]',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="shrink-0 rounded-md px-3 py-1.5 text-xs tracking-wide transition-colors text-[#4a5568] hover:text-[#9ca3af]"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
