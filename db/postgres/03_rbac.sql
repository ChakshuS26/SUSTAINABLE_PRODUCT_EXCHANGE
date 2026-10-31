-- =====================================================================
-- 03_rbac.sql  |  Role-based access control INSIDE the database
-- Rubric: "Minimum two roles and role-based access control in database (4)"
--   app_user  : normal member   -> can only change own rows (Row Level Security)
--   app_admin : administrator   -> full access incl. audit_log
-- The Next.js backend runs every request as:  SET LOCAL ROLE app_user|app_admin
-- and sets   app.user_id   so the policies know who is calling.
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user')  THEN CREATE ROLE app_user  NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN CREATE ROLE app_admin NOLOGIN; END IF;
END $$;

-- connecting user must be allowed to SET ROLE to them
GRANT app_user, app_admin TO CURRENT_USER;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user, app_admin;
GRANT USAGE ON SCHEMA public TO app_user, app_admin;

-- ---------- app_user privileges --------------------------------------
GRANT SELECT ON categories, products, reviews, transactions, exchange_requests, v_listings TO app_user;
-- password_hash / email / phone are NOT readable by normal users (column-level security)
GRANT SELECT (user_id, name, city, role, created_at) ON users TO app_user;
GRANT INSERT, UPDATE, DELETE ON products TO app_user;
GRANT INSERT, UPDATE         ON exchange_requests TO app_user;
GRANT INSERT                 ON reviews TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON PROCEDURE sp_complete_exchange(INT, INT) TO app_user;

-- ---------- app_admin privileges -------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT SELECT ON v_listings TO app_admin;
GRANT EXECUTE ON PROCEDURE sp_complete_exchange(INT, INT) TO app_admin;

-- ---------- Row Level Security ---------------------------------------
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;

-- products: everyone reads; only the owner writes
CREATE POLICY prod_select ON products FOR SELECT TO app_user USING (true);
CREATE POLICY prod_insert ON products FOR INSERT TO app_user WITH CHECK (owner_id = cur_uid());
CREATE POLICY prod_update ON products FOR UPDATE TO app_user USING (owner_id = cur_uid()) WITH CHECK (owner_id = cur_uid());
CREATE POLICY prod_delete ON products FOR DELETE TO app_user USING (owner_id = cur_uid());
CREATE POLICY prod_admin  ON products FOR ALL    TO app_admin USING (true) WITH CHECK (true);

-- requests: visible/changeable only to the requester or the product owner
CREATE POLICY req_select ON exchange_requests FOR SELECT TO app_user
    USING (requester_id = cur_uid()
           OR EXISTS (SELECT 1 FROM products p
                      WHERE p.product_id = exchange_requests.product_id AND p.owner_id = cur_uid()));
CREATE POLICY req_insert ON exchange_requests FOR INSERT TO app_user WITH CHECK (requester_id = cur_uid());
CREATE POLICY req_update ON exchange_requests FOR UPDATE TO app_user
    USING (requester_id = cur_uid()
           OR EXISTS (SELECT 1 FROM products p
                      WHERE p.product_id = exchange_requests.product_id AND p.owner_id = cur_uid()));
CREATE POLICY req_admin  ON exchange_requests FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- transactions: only the two parties
CREATE POLICY txn_select ON transactions FOR SELECT TO app_user
    USING (giver_id = cur_uid() OR receiver_id = cur_uid());
CREATE POLICY txn_admin  ON transactions FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- reviews: public to read, can only write as yourself
CREATE POLICY rev_select ON reviews FOR SELECT TO app_user USING (true);
CREATE POLICY rev_insert ON reviews FOR INSERT TO app_user WITH CHECK (reviewer_id = cur_uid());
CREATE POLICY rev_admin  ON reviews FOR ALL TO app_admin USING (true) WITH CHECK (true);
