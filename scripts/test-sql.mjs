// Runs ALL SQL files on an in-memory Postgres (PGlite) and checks behaviour.
// Usage: npm run test:sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('../db/postgres/', import.meta.url);
const db = new PGlite();
let passed = 0;
const ok = (name) => { passed++; console.log('  PASS', name); };

for (const f of ['01_schema', '02_routines', '03_rbac', '04_seed']) {
  await db.exec(readFileSync(new URL(f + '.sql', dir), 'utf8'));
  console.log('loaded', f + '.sql');
}

const one = async (sql, params) => (await db.query(sql, params)).rows;
const fails = async (fn, label, re) => {
  try { await fn(); } catch (e) { if (!re || re.test(e.message)) { ok(label + '  ->  ' + e.message); return; } throw e; }
  assert.fail('should have failed: ' + label);
};
const asUser = async (id, role, fn) => {
  await db.exec('BEGIN');
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query(`SELECT set_config('app.user_id', $1, true)`, [String(id)]);
    return await fn();
  } finally { await db.exec('ROLLBACK'); }
};

console.log('\n-- seed & triggers');
assert.equal((await one('SELECT count(*)::int n FROM users'))[0].n, 8); ok('8 users');
assert.equal((await one('SELECT count(*)::int n FROM products'))[0].n, 16); ok('16 products');
assert.equal((await one('SELECT count(*)::int n FROM transactions'))[0].n, 5); ok('5 transactions via procedure');
assert.equal((await one("SELECT status FROM exchange_requests WHERE request_id=2"))[0].status, 'rejected'); ok('trigger auto-rejected competing request r2');
assert.equal((await one("SELECT status FROM products WHERE product_id=3"))[0].status, 'completed'); ok('product completed after transaction');
assert.equal((await one("SELECT status FROM products WHERE product_id=14"))[0].status, 'completed'); ok('offered item in swap also completed');
assert.equal((await one("SELECT status FROM products WHERE product_id=16"))[0].status, 'reserved'); ok('accepted-but-not-completed product is reserved');
assert((await one('SELECT count(*)::int n FROM audit_log'))[0].n > 10); ok('audit_log filled by triggers');
assert.equal(Number((await one('SELECT fn_user_avg_rating(3) r'))[0].r), 5); ok('fn_user_avg_rating(3) = 5');
assert.equal(Number((await one('SELECT fn_user_avg_rating(5) r'))[0].r), 4.33); ok('fn_user_avg_rating(5) = 4.33');
assert.equal((await one('SELECT fn_category_path(11) p'))[0].p, 'Electronics > Laptops'); ok('fn_category_path recursive CTE');

console.log('\n-- constraints');
await fails(() => db.exec(`INSERT INTO products(owner_id,category_id,title,item_condition,listing_type,price) VALUES (2,5,'Free book','good','donate',100)`), 'donate with price rejected', /chk_price_matches_type/);
await fails(() => db.exec(`INSERT INTO products(owner_id,category_id,title,item_condition,listing_type,price) VALUES (2,5,'Book','broken','sell',100)`), 'bad condition rejected');
await fails(() => db.exec(`INSERT INTO exchange_requests(product_id,requester_id) VALUES (1,2)`), 'own-product request rejected', /own product/);
await fails(() => db.exec(`INSERT INTO exchange_requests(product_id,requester_id) VALUES (3,6)`), 'completed product cannot be requested', /no longer available/);
await fails(() => db.exec(`INSERT INTO reviews(txn_id,reviewer_id,reviewee_id,rating) VALUES (1,5,3,9)`), 'rating 9 rejected');
await fails(() => db.exec(`UPDATE exchange_requests SET status='pending' WHERE request_id=1`), 'illegal status change rejected', /Invalid status change/);
await fails(() => db.exec(`CALL sp_complete_exchange(8, 3)`), 'pending request cannot be completed', /Only accepted/);

console.log('\n-- RBAC / row level security');
await asUser(2, 'app_user', async () => {
  const r = await db.query(`UPDATE products SET title='HACKED' WHERE product_id=3`);
  assert.equal(r.affectedRows, 0); ok('user 2 cannot edit user 3 product (RLS)');
  const own = await db.query(`UPDATE products SET description='edited' WHERE product_id=1`);
  assert.equal(own.affectedRows, 1); ok('user 2 can edit own product');
});
await asUser(2, 'app_user', () => fails(() => db.query('SELECT password_hash FROM users'), 'user cannot read password_hash', /permission denied/));
await asUser(2, 'app_user', () => fails(() => db.query('SELECT * FROM audit_log'), 'user cannot read audit_log', /permission denied/));
await asUser(2, 'app_user', () => fails(() => db.query(`INSERT INTO products(owner_id,category_id,title,item_condition,listing_type) VALUES (3,5,'Not mine','good','donate')`), 'user cannot insert product for someone else', /row-level security/));
await asUser(2, 'app_user', async () => {
  const r = await db.query('SELECT request_id FROM exchange_requests');
  assert(r.rows.every((x) => [3, 4, 5, 1, 2, 6, 7, 8].includes(x.request_id)));
  const mine = await db.query('SELECT count(*)::int n FROM transactions');
  assert.equal(mine.rows[0].n, 2); ok('user 2 only sees own transactions (2 of 5)');
});
await asUser(1, 'app_admin', async () => {
  const r = await db.query('SELECT count(*)::int n FROM audit_log');
  assert(r.rows[0].n > 0); ok('admin can read audit_log');
  const t = await db.query('SELECT count(*)::int n FROM transactions');
  assert.equal(t.rows[0].n, 5); ok('admin sees all transactions');
});

console.log('\n-- demo scripts');
await db.exec(readFileSync(new URL('05_dml_demo.sql', dir), 'utf8'));
assert.equal((await one('SELECT count(*)::int n FROM users'))[0].n, 8); ok('05_dml_demo.sql ran and rolled back cleanly');
const q = readFileSync(new URL('06_queries.sql', dir), 'utf8');
const results = await db.exec(q);
assert(results.length >= 12); ok(`06_queries.sql: all ${results.length} queries executed`);
const win = results[9].rows; console.log('   ranking sample:', win.slice(0, 3));
const cte = results[8].rows; console.log('   root category counts:', cte);

console.log(`\nAll ${passed} checks passed.`);
