'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// buttons: array of { action, label, danger? }
export default function RequestActions({ id, buttons }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function act(action) {
    setBusy(true); setError('');
    const res = await fetch(`/api/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    router.refresh();
  }

  return (
    <>
      <div className="row">
        {buttons.map((b) => (
          <button key={b.action} disabled={busy} className={`small ${b.danger ? 'danger' : ''}`} onClick={() => act(b.action)}>{b.label}</button>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
    </>
  );
}
