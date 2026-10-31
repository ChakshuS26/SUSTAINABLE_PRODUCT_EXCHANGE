-- =====================================================================
-- 06_queries.sql  |  Nested / Correlated / Recursive / Join queries
-- Rubric: "Nested/correlated/Recursive Queries, Join SQL queries (4)"
-- All read-only.
-- =====================================================================

-- Q1. JOIN (3 tables): available listings with owner and category
SELECT p.title, p.listing_type, p.price, u.name AS owner, c.name AS category
FROM products p
JOIN users u      ON u.user_id = p.owner_id
JOIN categories c ON c.category_id = p.category_id
WHERE p.status = 'available'
ORDER BY p.created_at DESC;

-- Q2. LEFT JOIN + GROUP BY: every user with listing count and completed deals
SELECT u.name,
       COUNT(DISTINCT p.product_id)  AS listings,
       COUNT(DISTINCT t.txn_id)      AS completed_deals
FROM users u
LEFT JOIN products p     ON p.owner_id = u.user_id
LEFT JOIN transactions t ON t.giver_id = u.user_id OR t.receiver_id = u.user_id
GROUP BY u.user_id, u.name
ORDER BY completed_deals DESC, listings DESC;

-- Q3. GROUP BY + HAVING: categories having 2 or more listings
SELECT c.name, COUNT(*) AS listings, ROUND(AVG(p.price),2) AS avg_price
FROM categories c JOIN products p ON p.category_id = c.category_id
GROUP BY c.name
HAVING COUNT(*) >= 2
ORDER BY listings DESC;

-- Q4. NESTED query (IN): users who have donated something that was completed
SELECT name, city FROM users
WHERE user_id IN (SELECT giver_id FROM transactions WHERE txn_type = 'donate');

-- Q5. CORRELATED subquery: products priced above the average of their own category
SELECT p.title, p.price, p.category_id
FROM products p
WHERE p.listing_type = 'sell'
  AND p.price > (SELECT AVG(p2.price) FROM products p2
                 WHERE p2.category_id = p.category_id AND p2.listing_type = 'sell');

-- Q6. NOT EXISTS: users who have never listed a product
SELECT name FROM users u
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.owner_id = u.user_id);

-- Q7. EXISTS: listings that currently have pending requests
SELECT p.product_id, p.title
FROM products p
WHERE EXISTS (SELECT 1 FROM exchange_requests r
              WHERE r.product_id = p.product_id AND r.status = 'pending');

-- Q8. RECURSIVE CTE: full category tree with depth and path
WITH RECURSIVE tree AS (
    SELECT category_id, name, parent_id, 0 AS depth, name::TEXT AS path
    FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.category_id, c.name, c.parent_id, t.depth + 1, t.path || ' > ' || c.name
    FROM categories c JOIN tree t ON c.parent_id = t.category_id
)
SELECT repeat('  ', depth) || name AS category, path FROM tree ORDER BY path;

-- Q9. CTE + aggregate: listings count per ROOT category (rolls subcategories up)
WITH RECURSIVE tree AS (
    SELECT category_id, category_id AS root_id FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.category_id, t.root_id FROM categories c JOIN tree t ON c.parent_id = t.category_id
)
SELECT r.name AS root_category, COUNT(p.product_id) AS listings
FROM tree t
JOIN categories r ON r.category_id = t.root_id
LEFT JOIN products p ON p.category_id = t.category_id
GROUP BY r.name ORDER BY listings DESC;

-- Q10. WINDOW function: rank users by number of completed deals
SELECT name, deals, DENSE_RANK() OVER (ORDER BY deals DESC) AS rank
FROM (
    SELECT u.name, COUNT(t.txn_id) AS deals
    FROM users u LEFT JOIN transactions t ON u.user_id IN (t.giver_id, t.receiver_id)
    GROUP BY u.user_id, u.name
) s;

-- Q11. Use the stored FUNCTIONS and the VIEW
SELECT owner_name, owner_rating, COUNT(*) AS listings
FROM v_listings GROUP BY owner_name, owner_rating ORDER BY owner_rating DESC;

-- Q12. Audit trail written by triggers
SELECT logged_at, table_name, action, details FROM audit_log ORDER BY log_id;
