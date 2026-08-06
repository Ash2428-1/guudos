'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/browser';

type Mode = 'password' | 'magic' | 'reset';

const inputCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary';

function safeNext(): string {
  if (typeof window === 'undefined') return '/';
  const n = new URLSearchParams(window.location.search).get('next');
  return n && n.startsWith('/') ? n : '/';
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('password');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<'' | 'magic' | 'reset'>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(safeNext());
        return;
      }
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}`,
          },
        });
        if (error) throw error;
        setSent('magic');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/account`,
        });
        if (error) throw error;
        setSent('reset');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        {sent === 'magic' ? (
          <>Check <span className="font-medium">{email}</span> for a sign-in link.</>
        ) : (
          <>Check <span className="font-medium">{email}</span> for a link to set your password.</>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="you@guudapp.co"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />

      {mode === 'password' && (
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy
          ? 'Please wait…'
          : mode === 'password'
            ? 'Sign in'
            : mode === 'magic'
              ? 'Send sign-in link'
              : 'Send password reset link'}
      </button>

      {message && <p className="text-sm text-destructive">{message}</p>}

      <div className="flex flex-col gap-1 pt-1 text-xs text-muted-foreground">
        {mode === 'password' ? (
          <>
            <button type="button" className="text-left hover:text-foreground" onClick={() => { setMode('reset'); setMessage(''); }}>
              Set or reset password
            </button>
            <button type="button" className="text-left hover:text-foreground" onClick={() => { setMode('magic'); setMessage(''); }}>
              Email me a sign-in link instead
            </button>
          </>
        ) : (
          <button type="button" className="text-left hover:text-foreground" onClick={() => { setMode('password'); setMessage(''); }}>
            ← Back to password sign-in
          </button>
        )}
      </div>
    </form>
  );
}
