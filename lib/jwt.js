// Edge-safe JWT helpers (used by middleware.js and server code)
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE = 'sx_token';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-change-me');

export const signToken = (user) =>
  new SignJWT({ id: user.user_id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}
