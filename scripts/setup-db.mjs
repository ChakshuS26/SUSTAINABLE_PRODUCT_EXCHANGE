// Creates all PostgreSQL tables, routines, roles and seed data.
// Usage: npm run db:setup   (needs DATABASE_URL in .env and the database to exist)
import pg from 'pg';
import { readFileSync } from 'node:fs';

const files = ['01_schema', '02_routines', '03_rbac', '04_seed'];
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
for (const f of files) {
  process.stdout.write(`running ${f}.sql ... `);
  await client.query(readFileSync(new URL(`../db/postgres/${f}.sql`, import.meta.url), 'utf8'));
  console.log('ok');
}
await client.end();
console.log('\nPostgreSQL ready. Demo logins (password: password123):');
console.log('  admin@exchange.com (admin)   ravi@example.com (user)');
