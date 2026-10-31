import { withRole } from '@/lib/pg';
import { requireSession } from '@/lib/auth';
import { handle, bad } from '@/lib/api';

// POST /api/requests  { product_id, offered_product_id?, message? }
// Validation (own product, availability, offered item ownership) is done by trigger trg_validate_request.
export async function POST(req) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json();
    if (!b.product_id) bad('product_id is required');
    const { rows } = await withRole(s, (c) =>
      c.query(
        `INSERT INTO exchange_requests (product_id, requester_id, offered_product_id, message)
         VALUES ($1, $2, $3, $4) RETURNING request_id`,
        [b.product_id, s.id, b.offered_product_id || null, b.message || null]
      )
    );
    return Response.json(rows[0], { status: 201 });
  });
}
