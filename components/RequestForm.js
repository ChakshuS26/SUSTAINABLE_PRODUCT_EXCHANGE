'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestForm({ product, offers }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const f = Object.fromEntries(new FormData(e.target));
    const res = await fetch('/api/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.product_id, offered_product_id: f.offered || null, message: f.message }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    setDone(true);
    router.refresh();
  }

  if (done) return <div className="okmsg">Request sent! Track it under “My activity”.</div>;
  const verb = product.listing_type === 'sell' ? 'Buy this item' : product.listing_type === 'donate' ? 'Request this item' : 'Propose an exchange';
  return (
    <form onSubmit={submit}>
      <label>Message to the owner</label>
      <textarea name="message" rows={2} placeholder="Say hello, suggest a pickup time…" />
      {product.listing_type === 'exchange' && (
        <>
          <label>Item you offer in return</label>
          <select name="offered" defaultValue="">
            <option value="">(decide later in chat)</option>
            {offers.map((o) => <option key={o.product_id} value={o.product_id}>{o.title}</option>)}
          </select>
        </>
      )}
      {error && <div className="error">{error}</div>}
      <p><button disabled={busy}>{busy ? 'Sending…' : verb}</button></p>
    </form>
  );
}
