'use client'

import { useState } from 'react'
import { BookOpenCheck, Loader2, Mail, Lock, User as UserIcon } from 'lucide-react'
import { useLogin, useRegister, useGoogle } from '@/hooks/use-data'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useLogin()
  const register = useRegister()
  const google = useGoogle()
  const pending = login.isPending || register.isPending || google.isPending

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const fn = mode === 'login' ? login.mutateAsync : register.mutateAsync
    fn(mode === 'login' ? { email, password } : { email, password, name })
      .then(() => toast.success(mode === 'login' ? 'Welcome back' : 'Account created'))
      .catch((err: ApiError) => toast.error(err.message))
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--primary) 16%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">Cadence</h1>
          <p className="mt-1 text-sm text-text-muted">Your personal task journal — plan, reflect, repeat.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-5 flex rounded-xl bg-muted p-1 text-sm">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 font-medium transition-colors ${
                  mode === m ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <Field icon={UserIcon}>
                <input
                  className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            <Field icon={Mail}>
              <input
                type="email"
                required
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field icon={Lock}>
              <input
                type="password"
                required
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={() => google.mutateAsync().catch((err: ApiError) => toast.error(err.message))}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-text-primary transition hover:bg-muted disabled:opacity-60"
          >
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-text-muted">
          Your data is stored locally in this sandbox and scoped to your account.
          <br />Use any email + password to create an account.
        </p>
      </div>
    </div>
  )
}

function Field({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 focus-within:border-primary">
      <Icon className="h-4 w-4 text-text-muted" />
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}
