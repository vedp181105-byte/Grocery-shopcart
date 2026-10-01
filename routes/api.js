const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');
const Order   = require('../models/Order');
const User    = require('../models/User');
const Contact = require('../models/Contact');

const CATS = {1:'Fruits',2:'Vegetables',3:'Dairy & Eggs',4:'Bakery',5:'Meat & Fish',6:'Beverages',7:'Snacks',8:'Frozen Foods',9:'Organic'};

// ─── PRODUCTS ────────────────────────────────────────────────────
// GET /api/products  ?cat=&sort=&q=&feat=
router.get('/products', async (req, res) => {
  try {
    const { cat, sort, q, feat } = req.query;
    const query = {};

    if (cat && cat !== '0') query.cat = parseInt(cat);
    if (feat === 'true')    query.feat = true;
    if (q) {
      const rx = new RegExp(q, 'i');
      query.$or = [{ name: rx }, { desc: rx }, { badge: rx }];
    }

    let dbSort = {};
    if (sort === 'price-asc' || sort === 'price_asc')  dbSort = { price: 1 };
    if (sort === 'price-desc' || sort === 'price_desc') dbSort = { price: -1 };
    if (sort === 'disc' || sort === 'discount') dbSort = { disc: -1 };
    if (sort === 'price-desc') dbSort = { price: -1 };
    if (sort === 'rating')     dbSort = { rating: -1 };
    if (sort === 'disc')       dbSort = { disc: -1 };

    const products = await Product.find(query).sort(dbSort);
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/featured
router.get('/products/featured', async (req, res) => {
  try {
    const products = await Product.find({ feat: true }).sort({ rating: -1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const related = await Product.find({ cat: product.cat, id: { $ne: product.id } }).limit(6);
    res.json({ success: true, product, related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cats — category list with counts
router.get('/cats', async (req, res) => {
  try {
    const counts = await Product.aggregate([{ $group: { _id: '$cat', count: { $sum: 1 } } }]);
    const result = counts.map(c => ({ id: c._id, name: CATS[c._id] || 'Other', count: c.count }))
                         .sort((a, b) => a.id - b.id);
    res.json({ success: true, cats: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CART (session) ───────────────────────────────────────────────
function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

// GET /api/cart
router.get('/cart', async (req, res) => {
  try {
    const cart = getCart(req);
    const ids  = cart.map(c => c.id);
    const dbProds = await Product.find({ id: { $in: ids } });

    const enriched = cart.map(c => {
      const p = dbProds.find(pr => pr.id === c.id);
      if (!p) return null;
      return { ...c, product: p.toJSON(), lineTotal: p.price * c.qty };
    }).filter(Boolean);

    const sub = enriched.reduce((s, c) => s + c.lineTotal, 0);
    const del = sub >= 500 ? 0 : 49;
    const tax = Math.round(sub * 0.05);
    const tot = sub + del + tax;
    const count = cart.reduce((s, c) => s + c.qty, 0);

    res.json({ success: true, cart: enriched, sub, del, tax, tot, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cart  { id, qty }
router.post('/cart', async (req, res) => {
  try {
    const { id, qty = 1 } = req.body;
    const product = await Product.findOne({ id: parseInt(id) });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const cart = getCart(req);
    const existing = cart.find(c => c.id === parseInt(id));
    if (existing) existing.qty += parseInt(qty);
    else cart.push({ id: parseInt(id), qty: parseInt(qty) });
    req.session.cart = cart;

    const count = cart.reduce((s, c) => s + c.qty, 0);
    res.json({ success: true, message: `${product.name} added to cart`, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/cart/:id  { qty }
router.put('/cart/:id', (req, res) => {
  const cart = getCart(req);
  const item = cart.find(c => c.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not in cart' });
  item.qty = Math.max(1, parseInt(req.body.qty));
  req.session.cart = cart;
  res.json({ success: true });
});

// DELETE /api/cart/:id
router.delete('/cart/:id', (req, res) => {
  req.session.cart = getCart(req).filter(c => c.id !== parseInt(req.params.id));
  const count = req.session.cart.reduce((s, c) => s + c.qty, 0);
  res.json({ success: true, count });
});

// DELETE /api/cart  — clear
router.delete('/cart', (req, res) => {
  req.session.cart = [];
  res.json({ success: true });
});

// ─── WISHLIST (session) ───────────────────────────────────────────
function getWishlist(req) {
  if (!req.session.wishlist) req.session.wishlist = [];
  return req.session.wishlist;
}

router.get('/wishlist', async (req, res) => {
  try {
    const wishlist = getWishlist(req);
    const products = await Product.find({ id: { $in: wishlist } });
    res.json({ success: true, wishlist, products, count: wishlist.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/wishlist/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await Product.findOne({ id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const wishlist = getWishlist(req);
    const idx = wishlist.indexOf(id);
    let action;
    if (idx > -1) { wishlist.splice(idx, 1); action = 'removed'; }
    else          { wishlist.push(id);        action = 'added'; }

    req.session.wishlist = wishlist;
    res.json({ success: true, action, count: wishlist.length, liked: action === 'added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ORDERS ── saved to MongoDB ───────────────────────────────────
// POST /api/orders
router.post('/orders', async (req, res) => {
  try {
    const { name, email, phone, addr, pay, notes, items, sub, del, tax, tot } = req.body;

    if (!name || !items || !items.length)
      return res.status(400).json({ success: false, message: 'Name and items are required' });

    const now = new Date();
    const inv = 'IGS-' + now.toISOString().slice(2,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000);

    const order = await Order.create({
      inv, name, email, phone, addr, pay: pay || 'Cash on Delivery',
      notes: notes || '',
      items: items.map(it => ({
        id: it.id, name: it.name, img: it.img, price: it.price,
        orig: it.orig, unit: it.unit, cat: it.cat,
        qty: it.qty, lineTotal: it.lineTotal,
      })),
      sub, del, tax, tot,
      status: 'confirmed',
      eta:  'Today, within 2 hours',
      bmsg: '✅ Order received & being prepared by our team!',
    });

    // Clear cart after successful order
    req.session.cart = [];

    const obj = order.toObject();
    res.json({ success: true, order: { ...obj, inv: order.inv } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders  — all orders (for My Orders page)
router.get('/orders', async (req, res) => {
  try {
    // If user is logged in, filter by their email; otherwise return session orders
    const { email } = req.query;
    const query = email ? { email } : {};
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders: orders.map(o => o.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/:inv
router.get('/orders/:inv', async (req, res) => {
  try {
    const order = await Order.findOne({ inv: req.params.inv });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: order.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/orders/:inv/cancel
router.patch('/orders/:inv/cancel', async (req, res) => {
  try {
    const order = await Order.findOne({ inv: req.params.inv });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['confirmed', 'processing'].includes(order.status))
      return res.status(400).json({ success: false, message: 'Cannot cancel this order' });

    order.status      = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    await order.save();
    res.json({ success: true, order: order.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── AUTH ── saved to MongoDB ─────────────────────────────────────
// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, phone, pass } = req.body;
    if (!name || !email || !pass)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (pass.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, phone: phone || '', pass });
    req.session.user = { name: user.name, email: user.email, phone: user.phone };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, pass } = req.body;
    if (!email || !pass)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ success: false, message: 'Incorrect email or password' });

    const match = await user.matchPassword(pass);
    if (!match)
      return res.status(401).json({ success: false, message: 'Incorrect email or password' });

    req.session.user = { name: user.name, email: user.email, phone: user.phone };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  req.session.user = null;
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/auth/me', (req, res) => {
  if (req.session.user)
    res.json({ success: true, user: req.session.user });
  else
    res.json({ success: false, user: null });
});

// ─── CONTACT ── saved to MongoDB ─────────────────────────────────
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });

    await Contact.create({ name, email, subject: subject || '', message });
    res.json({ success: true, message: "Message received! We'll reply within 24 hours." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
