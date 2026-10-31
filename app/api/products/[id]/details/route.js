import { query } from '@/lib/pg';
import { getSession, requireSession } from '@/lib/auth';
import { getDetails, updateDetails, addNote, removeNote, deleteDetails } from '@/lib/mongo';
import { handle, bad } from '@/lib/api';

async function ownerOf(id) {
  const { rows } = await query('SELECT owner_id FROM products WHERE product_id = $1', [id]);
  if (!rows[0]) bad('Product not found', 404);
  return rows[0].owner_id;
}
const canEdit = (s, ownerId) => s.role === 'admin' || s.id === ownerId;

// READ
export async function GET(_req, { params }) {
  return handle(async () => {
    const { id } = await params;
    const doc = await getDetails(id);
    if (!doc) bad('No details for this product', 404);
    return Response.json(doc);
  });
}

// UPDATE (owner/admin): attributes, tags, pickup info
export async function PUT(req, { params }) {
  return handle(async () => {
    const s = await requireSession();
    const { id } = await params;
    if (!canEdit(s, await ownerOf(id))) bad('Only the owner can edit details', 403);
    await updateDetails(id, await req.json());
    return Response.json({ ok: true });
  });
}

// CREATE note (any logged-in user, e.g. a question to the owner)
export async function POST(req, { params }) {
  return handle(async () => {
    const s = await requireSession();
    const { id } = await params;
    await addNote(id, s.id, s.name, (await req.json()).text);
    return Response.json({ ok: true }, { status: 201 });
  });
}

// DELETE: ?note=<id> removes one note (author, owner or admin); no param removes the whole document (owner/admin)
export async function DELETE(req, { params }) {
  return handle(async () => {
    const s = await requireSession();
    const { id } = await params;
    const owner = await ownerOf(id);
    const noteId = new URL(req.url).searchParams.get('note');
    if (noteId) {
      const n = await removeNote(id, noteId, s.id, canEdit(s, owner));
      if (!n) bad('Note not found or not yours', 404);
    } else {
      if (!canEdit(s, owner)) bad('Only the owner can delete details', 403);
      await deleteDetails(id);
    }
    return Response.json({ ok: true });
  });
}
