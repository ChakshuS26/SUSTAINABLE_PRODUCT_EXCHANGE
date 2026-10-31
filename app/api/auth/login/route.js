import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from '@/lib/pg';
import { COOKIE, signToken } from '@/lib/jwt';
import { handle, bad } from '@/lib/api';

export async function POST(req) {
  return handle(async () => {
    const { email, password } = await req.json();
    if (!email || !password) bad('Email and password are required');

    const { rows } = await query(
      'SELECT user_id, name, role, password_hash FROM users WHERE email = lower($1)',
      [email.trim()]
    );
    const u = rows[0];
    const valid = u && (await bcrypt.compare(password, u.password_hash));
    if (!valid) bad('Wrong email or password', 401);

    const token = await signToken(u);
    (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    return Response.json({ ok: true, user: { id: u.user_id, name: u.name, role: u.role } });
  });
}
