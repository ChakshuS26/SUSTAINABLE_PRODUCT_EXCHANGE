import { MongoClient, ObjectId } from 'mongodb';

const g = globalThis;

async function col() {
  if (!g._mongoClient) g._mongoClient = new MongoClient(process.env.MONGODB_URI).connect();
  const client = await g._mongoClient;
  return client.db(process.env.MONGODB_DB || 'sustainable_exchange').collection('product_details');
}

// Rough environmental impact per reused item (kg CO2 avoided, kg waste diverted)
const IMPACT = {
  Books: [2.5, 1.0],
  Clothes: [10, 0.8],
  Electronics: [40, 1.5],
  Furniture: [25, 7],
};
export const impactFor = (rootCategory) => IMPACT[rootCategory] ?? [5, 1];

const KEY = /^[a-z][a-z0-9_]{0,29}$/i;
const clean = (s) => String(s).trim().toLowerCase().slice(0, 30);

/* ---------------------------- CREATE ---------------------------- */
export async function createDetails(productId, { rootCategory, city, tags = [], attributes = {} }) {
  const [co2, waste] = impactFor(rootCategory);
  const now = new Date();
  const c = await col();
  await c.insertOne({
    product_id: Number(productId),
    tags: [...new Set(tags.map(clean).filter(Boolean))],
    attributes,
    images: [],
    pickup: { city: city ?? null, availability: ['weekends'] },
    impact: { co2_saved_kg: co2, waste_diverted_kg: waste },
    notes: [],
    created_at: now,
    updated_at: now,
  });
}

/* ----------------------------- READ ----------------------------- */
export async function getDetails(productId) {
  const doc = await (await col()).findOne({ product_id: Number(productId) });
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)); // plain object (ObjectId -> string) for React
}

export async function searchByTag(tag) {
  const docs = await (await col()).find({ tags: clean(tag) }).project({ product_id: 1 }).toArray();
  return docs.map((d) => d.product_id);
}

export async function impactByCity() {
  return (await col()).aggregate([
    { $group: { _id: '$pickup.city', items: { $sum: 1 }, co2: { $sum: '$impact.co2_saved_kg' }, waste: { $sum: '$impact.waste_diverted_kg' } } },
    { $sort: { co2: -1 } },
  ]).toArray();
}

export async function topTags(limit = 8) {
  return (await col()).aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', used: { $sum: 1 } } },
    { $sort: { used: -1, _id: 1 } },
    { $limit: limit },
  ]).toArray();
}

/* ---------------------------- UPDATE ---------------------------- */
// setAttrs: {key: value}, removeAttrs: [key], addTags: [..], removeTags: [..]
export async function updateDetails(productId, { setAttrs = {}, removeAttrs = [], addTags = [], removeTags = [], pickup } = {}) {
  const c = await col();
  const filter = { product_id: Number(productId) };
  const $set = { updated_at: new Date() };
  const $unset = {};

  for (const [k, v] of Object.entries(setAttrs)) {
    if (!KEY.test(k)) throw Object.assign(new Error(`Invalid attribute name "${k}" (letters, digits, underscore)`), { status: 400 });
    $set[`attributes.${k.toLowerCase()}`] = typeof v === 'string' && v.trim() !== '' && !isNaN(v) ? Number(v) : String(v).slice(0, 200);
  }
  for (const k of removeAttrs) if (KEY.test(k)) $unset[`attributes.${k.toLowerCase()}`] = '';
  if (pickup?.city !== undefined) $set['pickup.city'] = String(pickup.city).slice(0, 80);
  if (pickup?.availability) $set['pickup.availability'] = pickup.availability.map(String).slice(0, 7);

  const op = { $set };
  if (Object.keys($unset).length) op.$unset = $unset;
  const res = await c.updateOne(filter, op);
  if (!res.matchedCount) throw Object.assign(new Error('No details document for this product'), { status: 404 });

  // $addToSet and $pull on the same array can't share one update -> two calls
  const add = [...new Set(addTags.map(clean).filter(Boolean))];
  if (add.length) await c.updateOne(filter, { $addToSet: { tags: { $each: add } } });
  const rem = removeTags.map(clean).filter(Boolean);
  if (rem.length) await c.updateOne(filter, { $pull: { tags: { $in: rem } } });
}

export async function addNote(productId, userId, userName, text) {
  const t = String(text ?? '').trim().slice(0, 300);
  if (!t) throw Object.assign(new Error('Note cannot be empty'), { status: 400 });
  const res = await (await col()).updateOne(
    { product_id: Number(productId) },
    { $push: { notes: { _id: new ObjectId(), by_user_id: userId, by_name: userName, text: t, at: new Date() } } }
  );
  if (!res.matchedCount) throw Object.assign(new Error('No details document for this product'), { status: 404 });
}

/* ---------------------------- DELETE ---------------------------- */
export async function removeNote(productId, noteId, requesterId, canModerate) {
  if (!ObjectId.isValid(noteId)) throw Object.assign(new Error('Invalid note id'), { status: 400 });
  const pull = canModerate ? { _id: new ObjectId(noteId) } : { _id: new ObjectId(noteId), by_user_id: requesterId };
  const res = await (await col()).updateOne({ product_id: Number(productId) }, { $pull: { notes: pull } });
  return res.modifiedCount;
}

export async function deleteDetails(productId) {
  return (await (await col()).deleteOne({ product_id: Number(productId) })).deletedCount;
}

export async function deleteDetailsMany(productIds) {
  if (!productIds.length) return 0;
  return (await (await col()).deleteMany({ product_id: { $in: productIds.map(Number) } })).deletedCount;
}
