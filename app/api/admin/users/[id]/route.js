import { withRole } from '@/lib/pg';
import { requireAdmin } from '@/lib/auth';
import { deleteDetailsMany } from '@/lib/mongo';
import { handle, bad } from '@/lib/api';

// DELETE /api/admin/users/:id  (admin only)
export async function DELETE(_req, { params }) {
  return handle(async () => {
    const s = await requireAdmin();
    const { id } = await params;
    if (Number(id) === s.id) bad('You cannot delete yourself');

    const productIds = await withRole(s, async (c) => {
      const u = await c.query('SELECT role FROM users WHERE user_id = $1', [id]);
      if (!u.rows[0]) bad('User not found', 404);
      if (u.rows[0].role === 'admin') bad('Cannot delete another admin');
      const ids = (await c.query('SELECT product_id FROM products WHERE owner_id = $1', [id])).rows.map((r) => r.product_id);
      // transactions reference users without cascade -> remove them first (admin has full rights)
      await c.query('DELETE FROM reviews WHERE txn_id IN (SELECT txn_id FROM transactions WHERE giver_id = $1 OR receiver_id = $1)', [id]);
      await c.query('DELETE FROM transactions WHERE giver_id = $1 OR receiver_id = $1', [id]);
      await c.query('DELETE FROM users WHERE user_id = $1', [id]);
      return ids;
    });
    await deleteDetailsMany(productIds).catch(() => {});
    return Response.json({ ok: true });
  });
}
