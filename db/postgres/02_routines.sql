
-- ---------- PROCEDURE: complete an accepted request -------------------
CREATE OR REPLACE PROCEDURE sp_complete_exchange(p_request_id INT, p_actor INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r exchange_requests%ROWTYPE;
    p products%ROWTYPE;
    v_uid INT;
BEGIN
    -- Verify that the supplied actor matches the backend's user ID.
    v_uid := cur_uid();

    IF v_uid IS NULL OR p_actor IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'Actor does not match the authenticated user';
    END IF;

    SELECT * INTO r
    FROM exchange_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request % not found', p_request_id;
    END IF;

    IF r.status <> 'accepted' THEN
        RAISE EXCEPTION
            'Only accepted requests can be completed (current: %)',
            r.status;
    END IF;

    SELECT * INTO p
    FROM products
    WHERE product_id = r.product_id;

    IF p.owner_id <> v_uid
       AND r.requester_id <> v_uid
       AND NOT EXISTS (
           SELECT 1
           FROM users
           WHERE user_id = v_uid AND role = 'admin'
       ) THEN
        RAISE EXCEPTION
            'Only the owner, requester or an admin can complete this request';
    END IF;

    INSERT INTO transactions(
        request_id, product_id, giver_id, receiver_id, txn_type, amount
    )
    VALUES (
        r.request_id, p.product_id, p.owner_id, r.requester_id,
        p.listing_type, p.price
    );

    -- The transaction trigger marks the main product and request completed.
    IF r.offered_product_id IS NOT NULL THEN
        UPDATE products
        SET status = 'completed'
        WHERE product_id = r.offered_product_id;
    END IF;
END $$;
