// =====================================================================
// MongoDB commands for the viva (paste into mongosh)
//   mongosh "mongodb://localhost:27017/sustainable_exchange"
// Rubric: "NoSQL feature RUD (7)" -> Read / Update / Delete
// =====================================================================

// ---------------- READ ----------------
db.product_details.find({ product_id: 5 })                       // one product
db.product_details.find({ tags: 'laptop' })                      // search by tag
db.product_details.find({ 'attributes.ram_gb': { $gte: 8 } })     // query inside flexible attributes
db.product_details.find({ 'impact.co2_saved_kg': { $gt: 20 } }, { product_id: 1, impact: 1 })

// aggregation: total environmental impact by city
db.product_details.aggregate([
  { $group: { _id: '$pickup.city',
              items: { $sum: 1 },
              co2: { $sum: '$impact.co2_saved_kg' },
              waste: { $sum: '$impact.waste_diverted_kg' } } },
  { $sort: { co2: -1 } }
])

// aggregation: most used tags
db.product_details.aggregate([
  { $unwind: '$tags' },
  { $group: { _id: '$tags', used: { $sum: 1 } } },
  { $sort: { used: -1 } }, { $limit: 5 }
])

// ---------------- UPDATE ----------------
db.product_details.updateOne({ product_id: 5 }, { $set: { 'attributes.ram_gb': 16 } })           // change a field
db.product_details.updateOne({ product_id: 5 }, { $addToSet: { tags: { $each: ['coding', 'i5'] } } }) // add tags (no duplicates)
db.product_details.updateOne({ product_id: 5 }, { $push: { notes: { text: 'Can demo before pickup', by_user_id: 4, at: new Date() } } })
db.product_details.updateMany({ 'pickup.city': 'Chennai' }, { $set: { 'pickup.availability': ['weekdays', 'weekends'] } })

// ---------------- DELETE ----------------
db.product_details.updateOne({ product_id: 5 }, { $pull: { tags: 'i5' } })                       // remove one tag
db.product_details.updateOne({ product_id: 5 }, { $unset: { 'attributes.warranty_months': '' } }) // remove one attribute
db.product_details.updateOne({ product_id: 5 }, { $pull: { notes: { by_user_id: 4 } } })         // remove a note
db.product_details.deleteOne({ product_id: 11 })                                                  // remove whole document

// validation demo (should FAIL because tags must be an array of strings)
db.product_details.insertOne({ product_id: 99, tags: 'oops', attributes: {}, created_at: new Date() })
