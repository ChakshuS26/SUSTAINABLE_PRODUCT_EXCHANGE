import { Pool } from 'pg';

const g = globalThis;
export const pool = g._pgPool ?? (g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL }));

// Plain query as the connection owner. Used ONLY for login/register and system lookups.
export const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside a transaction AS the database role of the logged-in user.
// The database itself then enforces permissions + row level security (see 03_rbac.sql).
export async function withRole(session, fn) {
  const role = session?.role === 'admin' ? 'app_admin' : 'app_user'; // whitelist, never user input
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${role}`);
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(session?.id ?? 0)]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export const PUBLIC = { id: 0, role: 'user' }; // anonymous visitor = ordinary role, no user id
