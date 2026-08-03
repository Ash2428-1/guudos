'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/browser';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        Check <span className="font-medium">{email}</span> for a sign-in link.
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
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-destructive">{message}</p>
      )}
    </form>
  );
}
