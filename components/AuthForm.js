'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(e.target));
    const res = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push(next);
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="sub">{signup ? 'Join and start giving things a second life.' : 'Log in to list, request and manage items.'}</p>
      {signup && (<><label>Full name</label><input name="name" required /></>)}
      <label>Email</label><input name="email" type="email" required />
      <label>Password</label><input name="password" type="password" minLength={6} required />
      {signup && (
        <div className="two">
          <div><label>City</label><input name="city" /></div>
          <div><label>Phone</label><input name="phone" placeholder="9876543210" /></div>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <p><button disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button></p>
      {!signup && <p className="meta">Demo: ravi@example.com or admin@exchange.com — password123</p>}
    </form>
  );
}
