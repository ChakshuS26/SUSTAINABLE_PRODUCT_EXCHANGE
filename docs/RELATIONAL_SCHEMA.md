# Relational Schema (rubric: keys, relationships, constraints — 3 marks)

PK = primary key, FK = foreign key, UK = unique, CK = check constraint.

| Table | Columns | Keys & constraints |
|---|---|---|
| **users** | user_id, name, email, password_hash, role, city, phone, created_at | PK user_id · UK email · CK email format · CK role IN (user, admin) · CK phone format |
| **categories** | category_id, name, parent_id | PK category_id · UK name · FK parent_id → categories (self, ON DELETE SET NULL) |
| **products** | product_id, owner_id, category_id, title, description, item_condition, listing_type, price, status, created_at | PK product_id · FK owner_id → users (CASCADE) · FK category_id → categories (RESTRICT) · CK title length ≥ 3 · CK item_condition · CK listing_type · CK status · CK price ≥ 0 · **CK (sell ⇒ price > 0, else price = 0)** |
| **exchange_requests** | request_id, product_id, requester_id, offered_product_id, message, status, created_at | PK request_id · FK product_id → products (CASCADE) · FK requester_id → users (CASCADE) · FK offered_product_id → products (SET NULL) · CK status · CK offered ≠ product · **partial UNIQUE (product_id, requester_id) WHERE status = 'pending'** |
| **transactions** | txn_id, request_id, product_id, giver_id, receiver_id, txn_type, amount, completed_at | PK txn_id · UK+FK request_id → exchange_requests · FK product_id · FK giver_id, receiver_id → users · CK giver ≠ receiver · CK txn_type · CK amount ≥ 0 |
| **reviews** | review_id, txn_id, reviewer_id, reviewee_id, rating, comment, created_at | PK review_id · FK txn_id → transactions (CASCADE) · FK reviewer_id, reviewee_id → users (CASCADE) · CK rating 1–5 · UK (txn_id, reviewer_id) · CK reviewer ≠ reviewee |
| **audit_log** | log_id, table_name, action, row_id, details, logged_at | PK log_id (written only by triggers) |

## Relationships (cardinality)

- users 1 — N products (one user lists many products)
- categories 1 — N products; categories 1 — N categories (tree)
- products 1 — N exchange_requests; users 1 — N exchange_requests
- exchange_requests 1 — 0..1 transactions
- transactions 1 — N reviews (at most 2: one per party)

## Normalisation

All tables are in **3NF**: every non-key attribute depends on the key only. Category names live in `categories` (not repeated in products); owner details live in `users`. `transactions.giver_id/receiver_id/amount` are intentionally stored as a historical snapshot, since the product price can change later.
