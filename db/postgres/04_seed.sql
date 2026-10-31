-- =====================================================================
-- 04_seed.sql  |  Sample data (all demo passwords = password123)
-- Triggers + procedure fire while loading, so audit_log fills itself.
-- =====================================================================

INSERT INTO users (name, email, password_hash, role, city, phone) VALUES
 ('Admin Asha',   'admin@exchange.com',  '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'admin', 'Bengaluru', '9000000001'),
 ('Ravi Kumar',   'ravi@example.com',    '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Bengaluru', '9000000002'),
 ('Priya Nair',   'priya@example.com',   '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Chennai',   '9000000003'),
 ('Arjun Mehta',  'arjun@example.com',   '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Mumbai',    '9000000004'),
 ('Sneha Reddy',  'sneha@example.com',   '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Hyderabad', '9000000005'),
 ('Karan Singh',  'karan@example.com',   '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Delhi',     '9000000006'),
 ('Meera Iyer',   'meera@example.com',   '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Chennai',   '9000000007'),
 ('Vikram Das',   'vikram@example.com',  '$2a$10$FFHwrk0xSZsVdZKr9FHuf.ISvHaW1NYjnh5g.ZJ80FcuceT0d0yFq', 'user',  'Pune',      '9000000008');

INSERT INTO categories (category_id, name, parent_id) VALUES
 (1,'Books',NULL),(2,'Clothes',NULL),(3,'Electronics',NULL),(4,'Furniture',NULL),
 (5,'Textbooks',1),(6,'Novels',1),
 (7,'Men',2),(8,'Women',2),(9,'Kids',2),
 (10,'Phones',3),(11,'Laptops',3),(12,'Accessories',3),
 (13,'Chairs',4),(14,'Tables',4);
SELECT setval(pg_get_serial_sequence('categories','category_id'), 14);

INSERT INTO products (owner_id, category_id, title, description, item_condition, listing_type, price) VALUES
 (2, 5,'Database System Concepts (6th Ed)','Silberschatz, light highlighting only','good','sell',450),
 (2, 6,'Harry Potter box set (7 books)','Complete set, paperback','like_new','exchange',0),
 (3, 7,'Denim jacket (M)','Barely worn, size M','good','donate',0),
 (3, 8,'Cotton kurta set','Size L, washed twice','like_new','sell',300),
 (4,11,'Dell Latitude E7470','8GB RAM, 256GB SSD, battery ok','fair','sell',18000),
 (4,10,'Redmi Note 9','4GB/64GB, screen guard on','good','exchange',0),
 (5,13,'Ergonomic study chair','Adjustable height, mesh back','good','sell',1500),
 (5,14,'Foldable study table','Works great, easy to carry','like_new','donate',0),
 (6, 9,'Kids bicycle (age 6-9)','Training wheels included','good','exchange',0),
 (6, 5,'Engineering Mathematics textbook','B.S. Grewal, clean copy','good','donate',0),
 (7,12,'Bluetooth headphones','Battery lasts 15 hrs','good','sell',600),
 (7, 8,'Silk saree','Worn once at a wedding','like_new','exchange',0),
 (8,12,'USB-C hub 6-in-1','HDMI + 3 USB ports','like_new','sell',400),
 (8, 6,'Atomic Habits','Paperback, no markings','good','exchange',0),
 (2,11,'Lenovo ThinkPad T440','i5, 8GB RAM, good for coding','fair','sell',12000),
 (3, 6,'Wings of Fire','Autobiography, paperback','good','donate',0);

-- requests (all start as pending; trigger validates each insert)
INSERT INTO exchange_requests (product_id, requester_id, offered_product_id, message) VALUES
 (3, 5, NULL, 'Would love this jacket, can pick up on weekend'),   -- r1
 (3, 6, NULL, 'Is this still available?'),                          -- r2
 (2, 8,   14, 'Swap Atomic Habits for the HP set?'),                -- r3
 (10,7, NULL, 'Need this for my sister, thank you!'),               -- r4
 (8, 2, NULL, 'Looking for a table for my hostel room'),            -- r5
 (16,4, NULL, 'Please keep this for me'),                           -- r6
 (7, 7, NULL, 'Will buy at listed price'),                          -- r7
 (12,3, NULL, 'Interested, can we meet in Chennai?');               -- r8

-- owners accept  -> trigger reserves product & auto-rejects r2
UPDATE exchange_requests SET status = 'accepted' WHERE request_id IN (1,3,4,5,6,7);

-- complete five of them via the stored procedure (actor = product owner)
CALL sp_complete_exchange(1, 3);
CALL sp_complete_exchange(3, 2);
CALL sp_complete_exchange(4, 6);
CALL sp_complete_exchange(5, 5);
CALL sp_complete_exchange(7, 5);

INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, rating, comment) VALUES
 (1, 5, 3, 5, 'Smooth pickup, jacket as described'),
 (1, 3, 5, 4, 'Polite and on time'),
 (2, 8, 2, 5, 'Great swap, books were in perfect shape'),
 (2, 2, 8, 4, 'Good experience'),
 (3, 7, 6, 5, 'Very generous, thank you!'),
 (4, 2, 5, 4, 'Table works perfectly'),
 (5, 7, 5, 5, 'Chair exactly as listed');
