// Creates the MongoDB collection (with $jsonSchema validation), indexes and seed documents.
// Usage: npm run db:mongo   (needs MONGODB_URI in .env)
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'sustainable_exchange');

await db.collection('product_details').drop().catch(() => {});

// ---- collection with schema validation (DDL equivalent) ----
await db.createCollection('product_details', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['product_id', 'tags', 'attributes', 'created_at'],
      properties: {
        product_id: { bsonType: ['int', 'long', 'double'], description: 'links to products.product_id in PostgreSQL' },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
        attributes: { bsonType: 'object', description: 'free-form specs that differ per category' },
        images: { bsonType: 'array', items: { bsonType: 'string' } },
        pickup: { bsonType: 'object' },
        impact: {
          bsonType: 'object',
          properties: {
            co2_saved_kg: { bsonType: ['double', 'int', 'long'], minimum: 0 },
            waste_diverted_kg: { bsonType: ['double', 'int', 'long'], minimum: 0 },
          },
        },
        notes: {
          bsonType: 'array',
          items: { bsonType: 'object', required: ['text', 'by_user_id'] },
        },
      },
    },
  },
});

// ---- indexes ----
const col = db.collection('product_details');
await col.createIndex({ product_id: 1 }, { unique: true });
await col.createIndex({ tags: 1 });
await col.createIndex({ 'attributes.brand': 1 }, { sparse: true });

// ---- seed (matches the products inserted by 04_seed.sql) ----
const now = new Date();
const d = (product_id, tags, attributes, co2, waste, city) => ({
  product_id, tags, attributes, images: [],
  pickup: { city, availability: ['weekends'] },
  impact: { co2_saved_kg: co2, waste_diverted_kg: waste },
  notes: [], created_at: now, updated_at: now,
});
await col.insertMany([
  d(1, ['dbms', 'engineering', 'textbook'], { author: 'Silberschatz', edition: '6th', pages: 1300 }, 2.5, 1.2, 'Bengaluru'),
  d(2, ['fantasy', 'box-set'], { author: 'J.K. Rowling', books: 7, language: 'English' }, 2.5, 3.5, 'Bengaluru'),
  d(3, ['winter', 'denim'], { size: 'M', color: 'blue', material: 'denim' }, 10, 0.8, 'Chennai'),
  d(4, ['ethnic', 'cotton'], { size: 'L', color: 'green', material: 'cotton' }, 10, 0.5, 'Chennai'),
  d(5, ['laptop', 'student'], { brand: 'Dell', ram_gb: 8, storage: '256GB SSD', warranty_months: 0 }, 40, 2.2, 'Mumbai'),
  d(6, ['phone', 'android'], { brand: 'Xiaomi', ram_gb: 4, storage: '64GB' }, 40, 0.2, 'Mumbai'),
  d(7, ['study', 'ergonomic'], { material: 'mesh', adjustable: true }, 25, 8, 'Hyderabad'),
  d(8, ['hostel', 'foldable'], { material: 'wood', dimensions_cm: '80x40x70' }, 25, 6, 'Hyderabad'),
  d(11, ['audio', 'wireless'], { brand: 'boAt', battery_hours: 15 }, 40, 0.3, 'Chennai'),
]);

console.log('MongoDB ready: collection product_details with validation, 3 indexes and', await col.countDocuments(), 'documents');
await client.close();
