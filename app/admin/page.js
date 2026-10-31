import { withRole } from '@/lib/pg';
import { getSession } from '@/lib/auth';
import { impactByCity, topTags } from '@/lib/mongo';
import DeleteUser from '@/components/DeleteUser';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const me = await getSession();
  if (me?.role !== 'admin') return <div className="error">Admins only.</div>;

  // runs as DB role app_admin -> allowed to read users.email and audit_log
  const d = await withRole(me, async (c) => ({
    totals: (await c.query(`
      SELECT (SELECT count(*) FROM users)::int AS users,
             (SELECT count(*) FROM products)::int AS products,
             (SELECT count(*) FROM exchange_requests WHERE status='pending')::int AS pending,
             (SELECT count(*) FROM transactions)::int AS deals`)).rows[0],
    perCategory: (await c.query(`
      WITH RECURSIVE tree AS (
        SELECT category_id, category_id AS root_id FROM categories WHERE parent_id IS NULL
        UNION ALL SELECT c.category_id, t.root_id FROM categories c JOIN tree t ON c.parent_id = t.category_id)
      SELECT r.name, COUNT(p.product_id)::int AS listings
        FROM tree t JOIN categories r ON r.category_id = t.root_id
        LEFT JOIN products p ON p.category_id = t.category_id
       GROUP BY r.name ORDER BY listings DESC`)).rows,
    users: (await c.query(`
      SELECT u.user_id, u.name, u.email, u.role, u.city, fn_user_avg_rating(u.user_id) AS rating,
             (SELECT count(*) FROM products p WHERE p.owner_id = u.user_id)::int AS listings
        FROM users u ORDER BY u.user_id`)).rows,
    audit: (await c.query(`SELECT logged_at, table_name, action, details FROM audit_log ORDER BY log_id DESC LIMIT 15`)).rows,
  }));

  let cities = [], tags = [], mongoDown = false;
  try { [cities, tags] = await Promise.all([impactByCity(), topTags()]); } catch { mongoDown = true; }

  return (
    <>
      <h1>Admin dashboard</h1>
      <p className="sub">Runs under the PostgreSQL role <code>app_admin</code>.</p>
      <div className="stats">
        {Object.entries(d.totals).map(([k, v]) => <div className="card stat" key={k}><b>{v}</b><span className="meta">{k}</span></div>)}
      </div>

      <div className="two">
        <div>
          <h2>Listings per category <span className="meta">(PostgreSQL, recursive CTE)</span></h2>
          <table><thead><tr><th>Category</th><th>Listings</th></tr></thead>
            <tbody>{d.perCategory.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.listings}</td></tr>)}</tbody></table>
        </div>
        <div>
          <h2>Impact by city <span className="meta">(MongoDB aggregation)</span></h2>
          {mongoDown ? <div className="error">MongoDB not reachable</div> : (
            <table><thead><tr><th>City</th><th>Items</th><th>CO₂ kg</th></tr></thead>
              <tbody>{cities.map((r) => <tr key={r._id}><td>{r._id ?? '—'}</td><td>{r.items}</td><td>{r.co2}</td></tr>)}</tbody></table>
          )}
          {!mongoDown && <p className="meta">Top tags: {tags.map((t) => `${t._id} (${t.used})`).join(', ')}</p>}
        </div>
      </div>

      <h2>Users</h2>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Listings</th><th>Rating</th><th></th></tr></thead>
        <tbody>
          {d.users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.city}</td><td>{u.listings}</td><td>{Number(u.rating) || '—'}</td>
              <td>{u.role !== 'admin' && <DeleteUser id={u.user_id} name={u.name} />}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Audit log <span className="meta">(written by triggers)</span></h2>
      <table>
        <thead><tr><th>When</th><th>Table</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>
          {d.audit.map((a, i) => <tr key={i}><td>{new Date(a.logged_at).toLocaleString('en-IN')}</td><td>{a.table_name}</td><td>{a.action}</td><td>{a.details}</td></tr>)}
        </tbody>
      </table>
    </>
  );
}
