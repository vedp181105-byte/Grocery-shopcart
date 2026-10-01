const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  id:        Number,
  name:      String,
  img:       String,
  price:     Number,
  orig:      Number,
  unit:      String,
  cat:       Number,
  qty:       Number,
  lineTotal: Number,
});

const orderSchema = new mongoose.Schema({
  inv:    { type: String, required: true, unique: true },
  name:   { type: String, required: true },
  email:  { type: String },
  phone:  { type: String },
  addr:   { type: String },
  pay:    { type: String, default: 'Cash on Delivery' },
  notes:  { type: String, default: '' },
  items:  [orderItemSchema],
  sub:    Number,
  del:    Number,
  tax:    Number,
  tot:    Number,
  status: { type: String, default: 'confirmed', enum: ['confirmed','processing','dispatched','delivered','cancelled'] },
  cancelledAt: { type: String, default: null },
  eta:    { type: String, default: 'Today, within 2 hours' },
  bmsg:   { type: String, default: '' },
}, { timestamps: true });

// Virtual formatted date/time for frontend
orderSchema.virtual('date').get(function () {
  return this.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
});
orderSchema.virtual('time').get(function () {
  return this.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
});
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
