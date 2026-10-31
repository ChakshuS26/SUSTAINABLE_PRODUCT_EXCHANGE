'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteUser({ id, name }) {
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <>
      <button className="danger small" onClick={async () => {
        if (!confirm(`Delete ${name} and all their listings?`)) return;
        const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (!res.ok) return setError((await res.json()).error);
        router.refresh();
      }}>Delete</button>
      {error && <div className="error">{error}</div>}
    </>
  );
}
