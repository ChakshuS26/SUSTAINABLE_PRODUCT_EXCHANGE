# Rubric Checklist — where each mark lives and how to show it

| # | Rubric item (marks) | Where it is | What to demo in the viva |
|---|---|---|---|
| 1 | ER diagram (2) | `docs/ER_DIAGRAM.md` | Export the Mermaid block to PNG, explain each relationship |
| 2 | Relational schema, keys, constraints (3) | `docs/RELATIONAL_SCHEMA.md` | Walk through PK/FK/UK/CHECK; mention 3NF |
| 3 | SQL DDL with constraints (4) | `db/postgres/01_schema.sql` | Try the failing inserts listed at the bottom of `05_dml_demo.sql` |
| 4 | NoSQL / vector DB creation (4) | `scripts/setup-mongo.mjs` (collection + `$jsonSchema` validator + indexes + seed) | Run `db.product_details.insertOne({product_id:99, tags:'oops', attributes:{}, created_at:new Date()})` → validation error |
| 5 | Technology justification (1) | README, section "Why SQL + MongoDB" | Read the 3-line justification |
| 6 | DML operations (4) | `db/postgres/05_dml_demo.sql` | Run it in psql; shows INSERT, INSERT…SELECT, UPDATE, UPDATE w/ subquery, DELETE (+ trigger), cascade |
| 7 | Nested / correlated / recursive / join queries (4) | `db/postgres/06_queries.sql` (12 queries) | Q4 nested, Q5 correlated, Q8 recursive CTE, Q1/Q2 joins |
| 8 | Procedure / function / trigger / CTE (6) | `db/postgres/02_routines.sql` | Procedure `sp_complete_exchange`; functions `fn_user_avg_rating`, `fn_category_path`; 5 triggers; CTE in `fn_category_path` and app queries |
| 9 | NoSQL feature — RUD (7) | `lib/mongo.js`, `db/mongo/viva_commands.js`, Details panel on a product page | Read (search by tag/attribute, aggregation), Update (`$set`, `$addToSet`, `$push`), Delete (`$pull`, `$unset`, `deleteOne`) |
| 10 | Next.js interface (3) | `app/**`, `components/**` | Browse → detail → list item → my activity → admin |
| 11 | Backend/API + DB integration (2) | `app/api/**`, `lib/pg.js`, `lib/mongo.js` | Create a listing: one request writes to PostgreSQL **and** MongoDB |
| 12 | Authentication + 2 roles + RBAC in database (4) | `lib/jwt.js`, `middleware.js`, `db/postgres/03_rbac.sql`, `lib/pg.js` | Log in as user vs admin; show `/admin` blocked for user; show `permission denied` for `password_hash`; RLS stops editing someone else's product |
| 13 | Documentation, Git/GitHub (2) | README + `docs/` | Make **regular, meaningful commits** (see README) |
| 14 | Originality, individual contribution, viva (4) | **You** | See "Your part" below |

## Your part (this is worth 4 marks and the viva decides it)

Evaluators ask you to explain and **modify** code live. Do these before the demo:

1. Read `02_routines.sql` until you can explain every trigger in one sentence.
2. Add one small feature of your own and commit it, for example:
   - a `wishlist` table + button, or a `condition` filter on the browse page,
   - a new SQL query in `06_queries.sql` (e.g. top 3 donors),
   - a new MongoDB field such as `"pickup.time_slots"`.
3. Change the project's look (colors, title) so it is visibly yours.
4. Be ready for questions like the ones below.

## Likely viva questions

- **Why two databases?** Structured, transactional data (users, requests, money, ownership) needs ACID, joins and constraints → PostgreSQL. Per-product specs differ wildly (a book has an ISBN, a laptop has RAM) → flexible documents in MongoDB, no ALTER TABLE per category.
- **What does the trigger `trg_request_status` do?** On accept: reserves the product and auto-rejects other pending requests. On cancel of an accepted request: frees the product.
- **How is RBAC enforced?** Two DB roles (`app_user`, `app_admin`) with GRANTs, column-level privilege hiding `password_hash`, and Row Level Security policies using `app.user_id`. The backend runs each request with `SET LOCAL ROLE`, so even a bug in the API can't let one user edit another's rows.
- **Why a procedure for completing?** It must be atomic: check status, check actor, insert transaction, mark swapped item — all in one transaction.
- **Where are passwords stored?** Only as bcrypt hashes; JWT in an httpOnly cookie.
- **What is a recursive CTE used for here?** Category tree: building "Electronics > Laptops" paths and including sub-categories when filtering.
- **How do you keep both DBs consistent?** Postgres is the source of truth; the Mongo document is created after the insert and deleted when the product is deleted. If Mongo is down the listing still works (details just show unavailable).
