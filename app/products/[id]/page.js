import Link from 'next/link';
import { notFound } from 'next/navigation';
import { withRole, PUBLIC } from '@/lib/pg';
import { getSession } from '@/lib/auth';
import { getDetails } from '@/lib/mongo';
import DetailsPanel from '@/components/DetailsPanel';
import RequestForm from '@/components/RequestForm';
import DeleteListing from '@/components/DeleteListing';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const me = await getSession();

  const data = await withRole(me ?? PUBLIC, async (c) => {
    const p = (await c.query('SELECT * FROM v_listings WHERE product_id = $1', [id])).rows[0];
    if (!p || !me) return { p, offers: [], pending: false };
    const offers = (await c.query(`SELECT product_id, title FROM products WHERE owner_id = $1 AND status = 'available'`, [me.id])).rows;
    const pending = (await c.query(`SELECT 1 FROM exchange_requests WHERE product_id = $1 AND requester_id = $2 AND status = 'pending'`, [id, me.id])).rowCount > 0;
    return { p, offers, pending };
  });
  if (!data.p) notFound();
  const { p, offers, pending } = data;

  let details = null, mongoDown = false;
  try { details = await getDetails(id); } catch { mongoDown = true; }

  const isOwner = me?.id === p.owner_id;
  const canEdit = isOwner || me?.role === 'admin';

  return (
    <>
      <p><Link href="/">← Back to browse</Link></p>
      <div className="two" style={{ alignItems: 'start' }}>
        <div className="card">
          <span className={`badge ${p.listing_type}`}>{p.listing_type}</span>{' '}
          <span className={`badge ${p.status}`}>{p.status}</span>
          <h1 style={{ marginTop: 8 }}>{p.title}</h1>
          <div className="meta">{p.category_path} · {p.item_condition.replace('_', ' ')}</div>
          <div className="price" style={{ margin: '8px 0' }}>
            {p.listing_type === 'sell' ? `₹${Number(p.price).toLocaleString('en-IN')}` : p.listing_type === 'donate' ? 'Free' : 'Open to exchange'}
          </div>
          <p>{p.description || <span className="meta">No description.</span>}</p>
          <div className="meta">
            Listed by <b>{p.owner_name}</b> {p.owner_city && `from ${p.owner_city}`} {Number(p.owner_rating) > 0 && `· ⭐ ${Number(p.owner_rating).toFixed(1)}`}
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '16px 0' }} />
          {!me && <p><Link className="btn" href={`/login?next=/products/${id}`}>Log in to request this item</Link></p>}
          {me && isOwner && (
            <>
              <p className="meta">This is your listing. Manage incoming requests in <Link href="/my">My activity</Link>.</p>
              {p.status === 'available' && <DeleteListing id={p.product_id} />}
            </>
          )}
          {me && !isOwner && p.status === 'available' && !pending && <RequestForm product={p} offers={offers} />}
          {me && !isOwner && pending && <div className="okmsg">You already have a pending request for this item.</div>}
          {me && !isOwner && p.status !== 'available' && <div className="error">This item is {p.status}.</div>}
        </div>

        {mongoDown ? <div className="error">Extra details are temporarily unavailable (MongoDB not reachable).</div>
          : <DetailsPanel productId={p.product_id} details={details} canEdit={canEdit} me={me ? { id: me.id, name: me.name } : null} />}
      </div>
    </>
  );
}
