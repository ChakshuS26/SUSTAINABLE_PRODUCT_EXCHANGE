'use client';
// MongoDB-backed panel: Read / Update / Delete of the flexible product details.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DetailsPanel({ productId, details, canEdit, me }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const url = `/api/products/${productId}/details`;

  async function call(method, body, extra = '') {
    setBusy(true); setError('');
    const res = await fetch(url + extra, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    router.refresh();
  }

  if (!details) return <div className="card"><h2 style={{ marginTop: 0 }}>Details</h2><p className="meta">No extra details stored for this item.</p></div>;

  const attrs = Object.entries(details.attributes ?? {});

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Details <span className="meta">(from MongoDB)</span></h2>

      <h3 style={{ fontSize: 15 }}>Specifications</h3>
      {attrs.length === 0 ? <p className="meta">None yet.</p> : (
        <dl className="attrs">
          {attrs.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{k.replace(/_/g, ' ')}</dt>
              <dd>{String(v)} {canEdit && <button className="small danger" disabled={busy} onClick={() => call('PUT', { removeAttrs: [k] })}>×</button>}</dd>
            </div>
          ))}
        </dl>
      )}
      {canEdit && (
        <form className="row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); call('PUT', { setAttrs: { [f.get('k').trim().replace(/\s+/g, '_')]: f.get('v') } }); e.target.reset(); }}>
          <input name="k" placeholder="name" required style={{ flex: 1 }} /><input name="v" placeholder="value" required style={{ flex: 1 }} /><button className="small" disabled={busy}>Set</button>
        </form>
      )}

      <h3 style={{ fontSize: 15, marginTop: 18 }}>Tags</h3>
      <div>
        {details.tags.length === 0 && <span className="meta">None yet.</span>}
        {details.tags.map((t) => (
          <span className="chip" key={t}>{t}{canEdit && <button disabled={busy} onClick={() => call('PUT', { removeTags: [t] })}>×</button>}</span>
        ))}
      </div>
      {canEdit && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); call('PUT', { addTags: new FormData(e.target).get('t').split(',') }); e.target.reset(); }}>
          <input name="t" placeholder="add tags, comma separated" required style={{ flex: 1 }} /><button className="small" disabled={busy}>Add</button>
        </form>
      )}

      <h3 style={{ fontSize: 15, marginTop: 18 }}>Environmental impact</h3>
      <p className="meta" style={{ margin: 0 }}>
        🌱 ≈ {details.impact?.co2_saved_kg} kg CO₂ avoided · ♻️ {details.impact?.waste_diverted_kg} kg waste diverted
        {details.pickup?.city && <> · 📍 pickup in {details.pickup.city}</>}
      </p>

      <h3 style={{ fontSize: 15, marginTop: 18 }}>Questions & notes</h3>
      {details.notes.length === 0 && <p className="meta">No notes yet.</p>}
      {details.notes.map((n) => (
        <div className="note" key={n._id}>
          <b>{n.by_name}</b> <span className="meta">{new Date(n.at).toLocaleDateString('en-IN')}</span>
          {(canEdit || me?.id === n.by_user_id) && <button className="small danger" style={{ marginLeft: 8 }} disabled={busy} onClick={() => call('DELETE', null, `?note=${n._id}`)}>delete</button>}
          <div>{n.text}</div>
        </div>
      ))}
      {me && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); call('POST', { text: new FormData(e.target).get('text') }); e.target.reset(); }}>
          <input name="text" placeholder="Ask the owner something…" required maxLength={300} style={{ flex: 1 }} /><button className="small" disabled={busy}>Post</button>
        </form>
      )}

      {canEdit && (
        <p style={{ marginTop: 18 }}>
          <button className="danger small" disabled={busy} onClick={() => confirm('Delete ALL extra details for this item?') && call('DELETE')}>Delete all details</button>
        </p>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
