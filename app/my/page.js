import Link from 'next/link';
import { withRole } from '@/lib/pg';
import { getSession } from '@/lib/auth';
import RequestActions from '@/components/RequestActions';
import ReviewForm from '@/components/ReviewForm';
import DeleteListing from '@/components/DeleteListing';

export const dynamic = 'force-dynamic';

export default async function MyActivity() {
  const me = await getSession();
  // Every query below runs under the DB role of the user. RLS limits rows to their own.
  const d = await withRole(me, async (c) => ({
    listings: (await c.query(`SELECT product_id, title, listing_type, price, status FROM products WHERE owner_id = $1 ORDER BY created_at DESC`, [me.id])).rows,
    incoming: (await c.query(`
      SELECT r.request_id, r.status, r.message, r.created_at, p.product_id, p.title, u.name AS requester, o.title AS offered_title
        FROM exchange_requests r
        JOIN products p ON p.product_id = r.product_id
        JOIN users u ON u.user_id = r.requester_id
        LEFT JOIN products o ON o.product_id = r.offered_product_id
       WHERE p.owner_id = $1 ORDER BY r.created_at DESC`, [me.id])).rows,
    outgoing: (await c.query(`
      SELECT r.request_id, r.status, p.product_id, p.title, u.name AS owner
        FROM exchange_requests r JOIN products p ON p.product_id = r.product_id JOIN users u ON u.user_id = p.owner_id
       WHERE r.requester_id = $1 ORDER BY r.created_at DESC`, [me.id])).rows,
    deals: (await c.query(`
      SELECT t.txn_id, t.txn_type, t.amount, t.completed_at, p.title,
             CASE WHEN t.giver_id = $1 THEN 'gave to ' || ur.name ELSE 'received from ' || ug.name END AS what,
             EXISTS (SELECT 1 FROM reviews v WHERE v.txn_id = t.txn_id AND v.reviewer_id = $1) AS reviewed
        FROM transactions t JOIN products p ON p.product_id = t.product_id
        JOIN users ug ON ug.user_id = t.giver_id JOIN users ur ON ur.user_id = t.receiver_id
       ORDER BY t.completed_at DESC`, [me.id])).rows,
  }));

  return (
    <>
      <h1>My activity</h1>
      <p className="sub">Your listings, requests and completed deals.</p>

      <h2>Requests on my items</h2>
      {d.incoming.length === 0 ? <div className="empty">No requests yet.</div> : (
        <table>
          <thead><tr><th>Item</th><th>From</th><th>Message</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {d.incoming.map((r) => (
              <tr key={r.request_id}>
                <td><Link href={`/products/${r.product_id}`}>{r.title}</Link>{r.offered_title && <div className="meta">offers: {r.offered_title}</div>}</td>
                <td>{r.requester}</td><td>{r.message ?? '—'}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                <td>
                  {r.status === 'pending' && <RequestActions id={r.request_id} buttons={[{ action: 'accept', label: 'Accept' }, { action: 'reject', label: 'Reject', danger: true }]} />}
                  {r.status === 'accepted' && <RequestActions id={r.request_id} buttons={[{ action: 'complete', label: 'Mark completed' }, { action: 'reject', label: 'Withdraw', danger: true }]} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>My requests</h2>
      {d.outgoing.length === 0 ? <div className="empty">You haven’t requested anything yet. <Link href="/">Browse items</Link></div> : (
        <table>
          <thead><tr><th>Item</th><th>Owner</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {d.outgoing.map((r) => (
              <tr key={r.request_id}>
                <td><Link href={`/products/${r.product_id}`}>{r.title}</Link></td><td>{r.owner}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                <td>{['pending', 'accepted'].includes(r.status) && <RequestActions id={r.request_id} buttons={[{ action: 'cancel', label: 'Cancel', danger: true }]} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Completed deals</h2>
      {d.deals.length === 0 ? <div className="empty">No completed deals yet.</div> : (
        <table>
          <thead><tr><th>Item</th><th>What happened</th><th>Type</th><th>Review</th></tr></thead>
          <tbody>
            {d.deals.map((t) => (
              <tr key={t.txn_id}>
                <td>{t.title}</td><td>You {t.what}</td>
                <td><span className={`badge ${t.txn_type}`}>{t.txn_type}</span>{t.txn_type === 'sell' && ` ₹${Number(t.amount).toLocaleString('en-IN')}`}</td>
                <td>{t.reviewed ? <span className="meta">✓ reviewed</span> : <ReviewForm txnId={t.txn_id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>My listings</h2>
      {d.listings.length === 0 ? <div className="empty">Nothing listed. <Link href="/products/new">List your first item</Link></div> : (
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {d.listings.map((p) => (
              <tr key={p.product_id}>
                <td><Link href={`/products/${p.product_id}`}>{p.title}</Link></td>
                <td><span className={`badge ${p.listing_type}`}>{p.listing_type}</span></td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td>{p.status === 'available' && <DeleteListing id={p.product_id} redirect="/my" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
