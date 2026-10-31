import { withRole } from '@/lib/pg';
import { requireSession } from '@/lib/auth';
import { handle, bad } from '@/lib/api';

// POST /api/reviews { txn_id, rating (1-5), comment }
// The reviewee is worked out in SQL: "the other party" of the transaction.
export async function POST(req) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json();
    const rating = Number(b.rating);
    if (!(rating >= 1 && rating <= 5)) bad('Rating must be 1 to 5');
    const r = await withRole(s, (c) =>
      c.query(
        `INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, rating, comment)
         SELECT t.txn_id, $2, CASE WHEN t.giver_id = $2 THEN t.receiver_id ELSE t.giver_id END, $3, $4
           FROM transactions t
          WHERE t.txn_id = $1 AND $2 IN (t.giver_id, t.receiver_id)`,
        [b.txn_id, s.id, rating, b.comment || null]
      )
    );
    if (!r.rowCount) bad('You can only review your own completed deals', 403);
    return Response.json({ ok: true }, { status: 201 });
  });
}
