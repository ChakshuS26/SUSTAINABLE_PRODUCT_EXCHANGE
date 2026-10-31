import { query } from '@/lib/pg';
import ProductForm from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProduct() {
  // only leaf categories can hold products in the UI (parents are groupings)
  const { rows } = await query(`
    SELECT c.category_id, fn_category_path(c.category_id) AS path
    FROM categories c
    WHERE NOT EXISTS (SELECT 1 FROM categories k WHERE k.parent_id = c.category_id)
    ORDER BY path`);
  return <ProductForm categories={rows} />;
}
