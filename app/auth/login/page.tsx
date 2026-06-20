'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT = `
  w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all
  bg-[var(--ink-surface)] border border-[rgba(200,168,75,0.2)]
  text-[#c8c3b4] placeholder-[#3a4555]
  focus:border-[rgba(200,168,75,0.5)] focus:bg-[var(--ink-raised)]
`.replace(/\s+/g, ' ').trim()

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(200,168,75,0.04) 0%, transparent 60%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{
              border: '1px solid rgba(200, 168, 75, 0.4)',
              background: 'radial-gradient(circle, rgba(200,168,75,0.12) 0%, transparent 70%)',
              color: '#e2c97e',
            }}
            aria-hidden
          >
            ⚓
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-[0.12em]" style={{ color: '#e2c97e' }}>
            CARRACK
          </h1>
          <p className="mt-1 text-xs tracking-widest" style={{ color: '#4a5568' }}>
            EXPEDITION TRACKER
          </p>
        </div>

        {/* Card */}
        <div
          className="space-y-4 rounded-2xl p-7"
          style={{
            background: 'var(--ink-surface)',
            border: '1px solid rgba(200, 168, 75, 0.18)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }}
        >
          <h2
            className="font-display text-sm font-semibold tracking-[0.15em] uppercase"
            style={{ color: '#7a7464' }}
          >
            Sign In
          </h2>

          {error && (
            <p
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{
                background: 'rgba(192, 57, 43, 0.12)',
                border: '1px solid rgba(192, 57, 43, 0.35)',
                color: '#e07070',
              }}
            >
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="block text-xs tracking-wider" style={{ color: '#4a5568' }}>EMAIL</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />
          </div>

          <div className="space-y-1">
            <label className="block text-xs tracking-wider" style={{ color: '#4a5568' }}>PASSWORD</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={INPUT} />
          </div>

          <button
            type="button"
            onClick={handleSubmit as never}
            disabled={loading}
            className="font-display mt-2 w-full rounded-xl py-2.5 text-sm font-semibold tracking-widest transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)',
              color: '#060a12',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(200, 168, 75, 0.3)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center text-xs" style={{ color: '#4a5568' }}>
            No account?{' '}
            <Link href="/auth/register" className="transition-colors" style={{ color: 'var(--brass)' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
