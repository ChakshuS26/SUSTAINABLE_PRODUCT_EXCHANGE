import { withRole, query, PUBLIC } from '@/lib/pg';
import { getSession, requireSession } from '@/lib/auth';
import { createDetails } from '@/lib/mongo';
import { handle, bad } from '@/lib/api';
import { LISTING_SQL } from '@/lib/queries';

// GET /api/products?q=&category=&type=   (public)
export async function GET(req) {
  return handle(async () => {
    const sp = new URL(req.url).searchParams;
    const session = (await getSession()) ?? PUBLIC;
    const rows = await withRole(session, async (c) =>
      (await c.query(LISTING_SQL, [sp.get('q') || null, sp.get('category') || null, sp.get('type') || null])).rows
    );
    return Response.json(rows);
  });
}

// POST /api/products  (logged in) -> row in PostgreSQL + details document in MongoDB
export async function POST(req) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json();
    if (!b.title?.trim()) bad('Title is required');
    if (!b.category_id) bad('Choose a category');
    if (!['sell', 'exchange', 'donate'].includes(b.listing_type)) bad('Invalid listing type');
    const price = b.listing_type === 'sell' ? Number(b.price) : 0;
    if (b.listing_type === 'sell' && !(price > 0)) bad('Selling items need a price above 0');

    const product = await withRole(s, async (c) =>
      (await c.query(
        `INSERT INTO products (owner_id, category_id, title, description, item_condition, listing_type, price)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING product_id`,
        [s.id, b.category_id, b.title.trim(), b.description || null, b.item_condition || 'good', b.listing_type, price]
      )).rows[0]
    );

    // second database: flexible details (tags, attributes, environmental impact)
    let mongo = true;
    try {
      const info = (await query(
        `SELECT split_part(fn_category_path($1), ' > ', 1) AS root, (SELECT city FROM users WHERE user_id = $2) AS city`,
        [b.category_id, s.id]
      )).rows[0];
      const attributes = {};
      for (const [k, v] of Object.entries(b.attributes ?? {})) if (k && String(v).trim()) attributes[k.toLowerCase()] = String(v).slice(0, 200);
      await createDetails(product.product_id, {
        rootCategory: info.root, city: info.city,
        tags: String(b.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
        attributes,
      });
    } catch (e) {
      console.error('MongoDB details failed:', e.message);
      mongo = false;
    }
    return Response.json({ product_id: product.product_id, mongo }, { status: 201 });
  });
}
