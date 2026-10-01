require('dotenv').config();
const mongoose   = require('mongoose');
const connectDB  = require('../config/db');
const Product    = require('../models/Product');
const { PRODUCTS } = require('../data/products');

(async () => {
  await connectDB();
  try {
    await Product.deleteMany({});
    console.log('✓ Cleared existing products');
    await Product.insertMany(PRODUCTS);
    console.log(`✓ Seeded ${PRODUCTS.length} products into MongoDB`);
    const counts = {};
    PRODUCTS.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    const CATS = {1:'Fruits',2:'Vegetables',3:'Dairy & Eggs',4:'Bakery',5:'Meat & Fish',6:'Beverages',7:'Snacks',8:'Frozen Foods',11:'Organic'};
    Object.entries(counts).forEach(([cat, n]) => console.log(`  ${CATS[cat] || 'Cat'+cat}: ${n} products`));
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✦ Done.');
    process.exit(0);
  }
})();
