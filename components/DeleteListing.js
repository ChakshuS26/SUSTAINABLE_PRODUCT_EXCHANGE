'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteListing({ id, redirect = '/my' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <>
      <button className="danger small" onClick={async () => {
        if (!confirm('Delete this listing permanently?')) return;
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) return setError((await res.json()).error);
        router.push(redirect); router.refresh();
      }}>Delete listing</button>
      {error && <div className="error">{error}</div>}
    </>
  );
}
