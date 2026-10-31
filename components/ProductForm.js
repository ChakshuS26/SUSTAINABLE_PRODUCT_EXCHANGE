'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductForm({ categories }) {
  const router = useRouter();
  const [type, setType] = useState('sell');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const f = Object.fromEntries(new FormData(e.target));
    const attributes = {};
    for (const i of [1, 2, 3]) if (f[`ak${i}`]?.trim()) attributes[f[`ak${i}`].trim().replace(/\s+/g, '_')] = f[`av${i}`];
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, attributes }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push(`/products/${data.product_id}`);
    router.refresh();
  }

  return (
    <form className="card form wide" onSubmit={submit}>
      <h1>List an item</h1>
      <p className="sub">Core data is saved in PostgreSQL; tags and specs go to MongoDB.</p>
      <label>Title</label><input name="title" required minLength={3} />
      <label>Description</label><textarea name="description" rows={3} />
      <div className="two">
        <div>
          <label>Category</label>
          <select name="category_id" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.path}</option>)}
          </select>
        </div>
        <div>
          <label>Condition</label>
          <select name="item_condition" defaultValue="good">
            <option value="new">New</option><option value="like_new">Like new</option>
            <option value="good">Good</option><option value="fair">Fair</option>
          </select>
        </div>
        <div>
          <label>What do you want to do?</label>
          <select name="listing_type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="sell">Sell</option><option value="exchange">Exchange</option><option value="donate">Donate (free)</option>
          </select>
        </div>
        <div>
          <label>Price (₹)</label>
          <input name="price" type="number" min="1" step="1" disabled={type !== 'sell'} required={type === 'sell'} />
        </div>
      </div>
      <label>Tags (comma separated)</label><input name="tags" placeholder="student, winter, coding" />
      <label>Extra details (optional, e.g. brand = Dell, size = M)</label>
      {[1, 2, 3].map((i) => (
        <div className="two" key={i} style={{ marginBottom: 6 }}>
          <input name={`ak${i}`} placeholder="name" /><input name={`av${i}`} placeholder="value" />
        </div>
      ))}
      {error && <div className="error">{error}</div>}
      <p><button disabled={busy}>{busy ? 'Saving…' : 'Publish listing'}</button></p>
    </form>
  );
}
