'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewForm({ txnId }) {
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <form className="row" onSubmit={async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txn_id: txnId, ...f }) });
      if (!res.ok) return setError((await res.json()).error);
      router.refresh();
    }}>
      <select name="rating" defaultValue="5" style={{ width: 80 }}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select>
      <input name="comment" placeholder="Short comment" style={{ flex: 1, minWidth: 140 }} />
      <button className="small">Review</button>
      {error && <span className="meta" style={{ color: 'var(--danger)' }}>{error}</span>}
    </form>
  );
}
