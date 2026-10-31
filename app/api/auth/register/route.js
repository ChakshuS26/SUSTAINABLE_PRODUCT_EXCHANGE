import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from '@/lib/pg';
import { COOKIE, signToken } from '@/lib/jwt';
import { handle, bad } from '@/lib/api';

export async function POST(req) {
  return handle(async () => {
    const { name, email, password, city, phone } = await req.json();
    if (!name?.trim() || !email?.trim()) bad('Name and email are required');
    if (!password || password.length < 6) bad('Password must be at least 6 characters');

    const hash = await bcrypt.hash(password, 10);
    // role is ALWAYS 'user' here - nobody can self-register as admin
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, city, phone, role)
       VALUES ($1, lower($2), $3, $4, $5, 'user')
       RETURNING user_id, name, role`,
      [name.trim(), email.trim(), hash, city || null, phone || null]
    );
    const token = await signToken(rows[0]);
    (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    return Response.json({ ok: true, user: rows[0] }, { status: 201 });
  });
}
