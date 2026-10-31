// Shared SQL used by both the API route and the server-rendered home page.
export const LISTING_SQL = `
  WITH RECURSIVE sub AS (
      SELECT category_id FROM categories WHERE category_id = $2::int
      UNION ALL
      SELECT c.category_id FROM categories c JOIN sub s ON c.parent_id = s.category_id
  )
  SELECT * FROM v_listings
  WHERE status = 'available'
    AND ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
    AND ($2::int  IS NULL OR category_id IN (SELECT category_id FROM sub))
    AND ($3::text IS NULL OR listing_type = $3)
  ORDER BY created_at DESC, product_id DESC`;
