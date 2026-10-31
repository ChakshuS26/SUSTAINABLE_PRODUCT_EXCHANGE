import { withRole } from '@/lib/pg';
import { requireSession } from '@/lib/auth';
import { handle, bad } from '@/lib/api';

// PATCH /api/requests/:id  { action: 'accept' | 'reject' | 'cancel' | 'complete' }
export async function PATCH(req, { params }) {
  return handle(async () => {
    const s = await requireSession();
    const { id } = await params;
    const { action } = await req.json();

    await withRole(s, async (c) => {
      if (action === 'accept' || action === 'reject') {
        const r = await c.query(
          `UPDATE exchange_requests r SET status = $2
            WHERE r.request_id = $1
              AND EXISTS (SELECT 1 FROM products p WHERE p.product_id = r.product_id AND p.owner_id = $3)`,
          [id, action === 'accept' ? 'accepted' : 'rejected', s.id]
        );
        if (!r.rowCount) bad('Only the product owner can do that', 403);
      } else if (action === 'cancel') {
        const r = await c.query(
          `UPDATE exchange_requests SET status = 'cancelled' WHERE request_id = $1 AND requester_id = $2`,
          [id, s.id]
        );
        if (!r.rowCount) bad('Only the requester can cancel', 403);
      } else if (action === 'complete') {
        await c.query('CALL sp_complete_exchange($1, $2)', [id, s.id]); // stored procedure
      } else {
        bad('Unknown action');
      }
    });
    return Response.json({ ok: true });
  });
}
