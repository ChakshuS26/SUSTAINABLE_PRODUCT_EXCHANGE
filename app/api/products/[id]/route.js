import { withRole } from '@/lib/pg';
import { requireSession } from '@/lib/auth';
import { deleteDetails } from '@/lib/mongo';
import { handle, bad } from '@/lib/api';

// PUT = edit a listing (database RLS guarantees only the owner / admin can)
export async function PUT(req, { params }) {
  return handle(async () => {
    const s = await requireSession();
    const { id } = await params;
    const b = await req.json();
    const price = b.listing_type === 'sell' ? Number(b.price) : 0;
    const res = await withRole(s, (c) =>
      c.query(
        `UPDATE products
            SET title = $2, description = $3, item_condition = $4, listing_type = $5, price = $6
          WHERE product_id = $1 AND status = 'available'`,
        [id, b.title, b.description || null, b.item_condition, b.listing_type, price]
      )
    );
    if (!res.rowCount) bad('Not found, not yours, or no longer editable', 404);
    return Response.json({ ok: true });
  });
}

// DELETE = remove listing in PostgreSQL, then its details in MongoDB
export async function DELETE(req, { params }) {
  return handle(async () => {
    const s = await requireSession();
    const { id } = await params;
    const res = await withRole(s, (c) => c.query('DELETE FROM products WHERE product_id = $1', [id]));
    if (!res.rowCount) bad('Not found or not yours', 404);
    await deleteDetails(id).catch((e) => console.error('mongo cleanup failed', e.message));
    return Response.json({ ok: true });
  });
}
