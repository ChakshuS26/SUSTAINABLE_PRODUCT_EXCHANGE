import { cookies } from 'next/headers';
import { COOKIE, verifyToken } from './jwt';

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function requireSession() {
  const s = await getSession();
  if (!s) throw Object.assign(new Error('Please log in first'), { status: 401 });
  return s;
}

export async function requireAdmin() {
  const s = await requireSession();
  if (s.role !== 'admin') throw Object.assign(new Error('Admins only'), { status: 403 });
  return s;
}
