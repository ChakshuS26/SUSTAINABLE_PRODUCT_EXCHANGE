# ♻️ Sustainable Product Exchange

A platform where users **sell, exchange or donate** unused products (books, clothes, electronics, furniture) instead of throwing them away.
PES University · DBMS · Experiential Learning Level 3 mini-project.

| Layer | Technology |
|---|---|
| Relational DB | **PostgreSQL** (tables, constraints, procedure, functions, triggers, views, CTEs, roles + RLS) |
| NoSQL DB | **MongoDB** (flexible product details, tags, notes, environmental impact) |
| Web | **Next.js 15** (App Router) + Route Handlers as the API |
| Auth | bcrypt + JWT (httpOnly cookie), roles `user` / `admin` |

## Why SQL + MongoDB (technology justification)

- **PostgreSQL** holds data that must be correct: users, listings, requests, transactions, reviews. It gives ACID transactions, foreign keys, CHECK constraints, triggers and row-level security.
- **MongoDB** holds data whose shape varies per product: a book has *author/ISBN*, a laptop has *RAM/storage*, a jacket has *size/material*. Documents avoid a new column or table for every category and make tags, notes and aggregations simple.
- Both are linked by `product_id`; PostgreSQL is the source of truth.

## Setup (about 10 minutes)

**Prerequisites:** Node 20+, PostgreSQL 14+, MongoDB 6+ (local install or a free MongoDB Atlas cluster).

```bash
npm install
cp .env.example .env            # then edit the values (Windows: copy .env.example .env)

# 1. create an empty database, e.g.
createdb sustainable_exchange   # or in psql:  CREATE DATABASE sustainable_exchange;

npm run db:setup                # PostgreSQL: schema, routines, roles, seed data
npm run db:mongo                # MongoDB: collection, validator, indexes, seed
npm run dev                     # http://localhost:3000
```

**Demo logins** (password for all: `password123`)

| Email | Role |
|---|---|
| admin@exchange.com | admin |
| ravi@example.com, priya@example.com, … | user |

### Check the database layer without installing anything
```bash
npm run test:sql      # runs every SQL file on an in-memory Postgres and asserts 28 behaviours
```

## Project structure

```
db/postgres/   01_schema → 02_routines → 03_rbac → 04_seed, plus 05_dml_demo, 06_queries
db/mongo/      viva_commands.js  (mongosh commands for Read/Update/Delete demo)
scripts/       setup-db.mjs, setup-mongo.mjs, test-sql.mjs
lib/           pg.js (role-switching), mongo.js (CRUD), jwt.js, auth.js, queries.js
app/           pages + app/api/** route handlers
components/    client components (forms, panels)
docs/          ER_DIAGRAM.md, RELATIONAL_SCHEMA.md, RUBRIC_CHECKLIST.md
```

## How it works (important for the viva)

1. **Login** checks the bcrypt hash and sets a signed JWT cookie. `middleware.js` blocks protected pages; each API route re-checks.
2. **Every data request** runs inside a transaction as `SET LOCAL ROLE app_user` (or `app_admin`) with `app.user_id` set. PostgreSQL itself then enforces who can read/write what (GRANTs, column privileges, RLS) — see `03_rbac.sql`.
3. **Request lifecycle:** pending → accepted → completed (or rejected/cancelled). Triggers validate each step, reserve products, auto-reject competing requests and write the audit log. Completion calls the stored procedure `sp_complete_exchange`.
4. **Creating a listing** writes a row in PostgreSQL and a details document in MongoDB, including an estimated CO₂ saving.

## Git / GitHub (2 marks)

```bash
git init
git add . && git commit -m "Add PostgreSQL schema and constraints"
```
Make **many small commits over several days** (schema, routines, seed, Mongo layer, auth, pages, docs, your own feature), then push to a public GitHub repo and link it in your report. `.env` is git-ignored — never commit secrets.

## Testing status

- PostgreSQL layer: tested on PostgreSQL 16 and PGlite (28 automated checks), plus an HTTP walkthrough of login, roles, request → accept → complete → review, RLS and admin actions.
- MongoDB layer: written and compiled but **not run in the development sandbox** (no MongoDB server available). Run `npm run db:mongo` and try the product detail page; if anything misbehaves, `db/mongo/viva_commands.js` shows the equivalent shell commands.
- See `docs/RUBRIC_CHECKLIST.md` for the mark-by-mark map and viva preparation.
