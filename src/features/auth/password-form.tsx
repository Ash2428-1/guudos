'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/browser';

export function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (password.length < 8) {
      setMessage('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
    } else {
      setOk(true);
      setPassword('');
      setConfirm('');
    }
  }

  const inputCls =
    'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary';

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input
        type="password"
        autoComplete="new-password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputCls}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={inputCls}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save password'}
      </button>
      {ok && <p className="text-sm text-primary">Password saved. You can use it to sign in next time.</p>}
      {message && <p className="text-sm text-destructive">{message}</p>}
    </form>
  );
}
