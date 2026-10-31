-- =====================================================================
-- 01_schema.sql  |  Sustainable Product Exchange  |  PostgreSQL (DDL)
-- Rubric: "SQL database implementation - DDL with constraints"
-- Re-runnable: drops everything first.
-- =====================================================================

DROP TABLE IF EXISTS audit_log, reviews, transactions, exchange_requests,
                     products, categories, users CASCADE;

-- ---------- USERS ----------------------------------------------------
CREATE TABLE users (
    user_id        SERIAL        PRIMARY KEY,
    name           VARCHAR(100)  NOT NULL,
    email          VARCHAR(150)  NOT NULL UNIQUE
                   CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    password_hash  TEXT          NOT NULL,
    role           VARCHAR(10)   NOT NULL DEFAULT 'user'
                   CHECK (role IN ('user', 'admin')),
    city           VARCHAR(80),
    phone          VARCHAR(15)   CHECK (phone ~ '^[0-9+ -]{7,15}$'),
    created_at     TIMESTAMP     NOT NULL DEFAULT now()
);

-- ---------- CATEGORIES (self-referencing tree) -----------------------
CREATE TABLE categories (
    category_id  SERIAL       PRIMARY KEY,
    name         VARCHAR(60)  NOT NULL UNIQUE,
    parent_id    INT          REFERENCES categories(category_id) ON DELETE SET NULL
);

-- ---------- PRODUCTS -------------------------------------------------
CREATE TABLE products (
    product_id      SERIAL         PRIMARY KEY,
    owner_id        INT            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id     INT            NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    title           VARCHAR(150)   NOT NULL CHECK (length(trim(title)) >= 3),
    description     TEXT,
    item_condition  VARCHAR(10)    NOT NULL
                    CHECK (item_condition IN ('new', 'like_new', 'good', 'fair')),
    listing_type    VARCHAR(10)    NOT NULL
                    CHECK (listing_type IN ('sell', 'exchange', 'donate')),
    price           NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (price >= 0),
    status          VARCHAR(10)    NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'reserved', 'completed')),
    created_at      TIMESTAMP      NOT NULL DEFAULT now(),
    -- business rule: only "sell" listings carry a price
    CONSTRAINT chk_price_matches_type CHECK (
        (listing_type = 'sell' AND price > 0) OR (listing_type <> 'sell' AND price = 0)
    )
);
CREATE INDEX idx_products_owner    ON products(owner_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status   ON products(status);

-- ---------- EXCHANGE REQUESTS ----------------------------------------
CREATE TABLE exchange_requests (
    request_id          SERIAL      PRIMARY KEY,
    product_id          INT         NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    requester_id        INT         NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
    offered_product_id  INT         REFERENCES products(product_id)          ON DELETE SET NULL,
    message             TEXT,
    status              VARCHAR(10) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','rejected','cancelled','completed')),
    created_at          TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT chk_offer_not_same CHECK (offered_product_id IS NULL OR offered_product_id <> product_id)
);
-- one open (pending) request per user per product
CREATE UNIQUE INDEX uq_pending_request
    ON exchange_requests(product_id, requester_id) WHERE status = 'pending';
CREATE INDEX idx_requests_product   ON exchange_requests(product_id);
CREATE INDEX idx_requests_requester ON exchange_requests(requester_id);

-- ---------- TRANSACTIONS (completed exchanges / sales / donations) ---
CREATE TABLE transactions (
    txn_id        SERIAL        PRIMARY KEY,
    request_id    INT           NOT NULL UNIQUE REFERENCES exchange_requests(request_id),
    product_id    INT           NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    giver_id      INT           NOT NULL REFERENCES users(user_id),
    receiver_id   INT           NOT NULL REFERENCES users(user_id),
    txn_type      VARCHAR(10)   NOT NULL CHECK (txn_type IN ('sell','exchange','donate')),
    amount        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    completed_at  TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT chk_giver_receiver CHECK (giver_id <> receiver_id)
);

-- ---------- REVIEWS --------------------------------------------------
CREATE TABLE reviews (
    review_id    SERIAL    PRIMARY KEY,
    txn_id       INT       NOT NULL REFERENCES transactions(txn_id) ON DELETE CASCADE,
    reviewer_id  INT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id  INT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating       INT       NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_review_once UNIQUE (txn_id, reviewer_id),
    CONSTRAINT chk_no_self_review CHECK (reviewer_id <> reviewee_id)
);

-- ---------- AUDIT LOG (filled by triggers) ---------------------------
CREATE TABLE audit_log (
    log_id     SERIAL      PRIMARY KEY,
    table_name VARCHAR(40) NOT NULL,
    action     VARCHAR(30) NOT NULL,
    row_id     INT,
    details    TEXT,
    logged_at  TIMESTAMP   NOT NULL DEFAULT now()
);
