import Link from 'next/link';
import { withRole, PUBLIC } from '@/lib/pg';
import { getSession } from '@/lib/auth';
import { LISTING_SQL } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const session = (await getSession()) ?? PUBLIC;
  const { listings, categories, stats } = await withRole(session, async (c) => ({
    listings: (await c.query(LISTING_SQL, [sp.q || null, sp.category || null, sp.type || null])).rows,
    categories: (await c.query(`
      WITH RECURSIVE tree AS (
        SELECT category_id, name, 0 AS depth, name::text AS path FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.category_id, c.name, t.depth + 1, t.path || ' > ' || c.name
        FROM categories c JOIN tree t ON c.parent_id = t.category_id)
      SELECT category_id, name, depth FROM tree ORDER BY path`)).rows,
    stats: (await c.query(`
      SELECT (SELECT count(*) FROM products WHERE status='available')::int AS available,
             (SELECT count(*) FROM transactions)::int AS deals,
             (SELECT count(*) FROM transactions WHERE txn_type='donate')::int AS donated`)).rows[0],
  }));

  return (
    <>
      <h1>Give things a second life</h1>
      <p className="sub">
        {stats.available} items available · {stats.deals} successful deals · {stats.donated} donations
      </p>

      <form className="filters">
        <input name="q" placeholder="Search books, clothes, laptops…" defaultValue={sp.q ?? ''} />
        <select name="category" defaultValue={sp.category ?? ''}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>{'  '.repeat(c.depth)}{c.name}</option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ''}>
          <option value="">Sell / Exchange / Donate</option>
          <option value="sell">For sale</option>
          <option value="exchange">Exchange</option>
          <option value="donate">Free (donate)</option>
        </select>
        <button>Search</button>
      </form>

      {listings.length === 0 ? (
        <div className="empty">No items match. Try another search.</div>
      ) : (
        <div className="grid">
          {listings.map((p) => (
            <Link key={p.product_id} href={`/products/${p.product_id}`} className="card" style={{ color: 'inherit' }}>
              <span className={`badge ${p.listing_type}`}>{p.listing_type}</span>
              <h3>{p.title}</h3>
              <div className="meta">{p.category_path}</div>
              <div className="meta">{p.item_condition.replace('_', ' ')} · {p.owner_city ?? 'Unknown city'}</div>
              <div className="price">{p.listing_type === 'sell' ? `₹${Number(p.price).toLocaleString('en-IN')}` : p.listing_type === 'donate' ? 'Free' : 'Swap'}</div>
              <div className="meta">by {p.owner_name} {Number(p.owner_rating) > 0 && `· ⭐ ${Number(p.owner_rating).toFixed(1)}`}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
