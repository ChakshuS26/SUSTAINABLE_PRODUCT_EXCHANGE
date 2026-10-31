-- =====================================================================
-- 05_dml_demo.sql  |  DML operations (INSERT / UPDATE / DELETE)
-- Rubric: "DML operations (4)"
-- Wrapped in a transaction and ROLLED BACK so your data stays untouched.
-- Remove the ROLLBACK (use COMMIT) if you want the changes to stay.
-- =====================================================================
BEGIN;

-- 1. INSERT a single row, return generated id
INSERT INTO users (name, email, password_hash, city, phone)
VALUES ('Demo Student', 'demo@example.com', 'x', 'Bengaluru', '9111111111')
RETURNING user_id, name;

-- 2. INSERT multiple rows
INSERT INTO products (owner_id, category_id, title, description, item_condition, listing_type, price)
VALUES
 ((SELECT user_id FROM users WHERE email='demo@example.com'), 5, 'Operating Systems textbook', 'Galvin 9th ed', 'good', 'sell', 350),
 ((SELECT user_id FROM users WHERE email='demo@example.com'), 12,'Mouse + keypad combo', 'Wireless', 'like_new', 'donate', 0);

-- 3. INSERT ... SELECT  (copy all donate listings of user 3 as a "wanted" template table)
CREATE TEMP TABLE tmp_donations AS
SELECT product_id, title FROM products WHERE listing_type = 'donate';
SELECT count(*) AS donation_rows_copied FROM tmp_donations;

-- 4. UPDATE with a condition
UPDATE products SET price = price * 0.90
WHERE listing_type = 'sell' AND status = 'available' AND item_condition = 'fair'
RETURNING product_id, title, price;

-- 5. UPDATE using a subquery
UPDATE users SET city = 'Chennai'
WHERE user_id IN (SELECT owner_id FROM products WHERE title LIKE 'Silk%');

-- 6. DELETE with a condition (fires trigger trg_audit_product_delete)
DELETE FROM products
WHERE owner_id = (SELECT user_id FROM users WHERE email='demo@example.com')
  AND listing_type = 'donate'
RETURNING product_id, title;

-- 7. Proof that trigger logged the delete
SELECT action, details FROM audit_log WHERE action = 'DELETE' ORDER BY log_id DESC LIMIT 1;

-- 8. DELETE cascades: removing the demo user removes the remaining product too
DELETE FROM users WHERE email = 'demo@example.com';

ROLLBACK;

-- ----- Constraint violations to show in the viva (each one should FAIL) ----
-- INSERT INTO products(owner_id,category_id,title,item_condition,listing_type,price)
--   VALUES (2,5,'Free book','good','donate',100);       -- chk_price_matches_type
-- INSERT INTO products(owner_id,category_id,title,item_condition,listing_type,price)
--   VALUES (2,5,'Book','broken','sell',100);            -- condition CHECK
-- INSERT INTO exchange_requests(product_id,requester_id) VALUES (1,2);  -- trigger: own product
-- INSERT INTO reviews(txn_id,reviewer_id,reviewee_id,rating) VALUES (1,5,3,9); -- rating CHECK
