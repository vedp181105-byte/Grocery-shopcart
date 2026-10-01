const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id:     { type: Number, required: true, unique: true },
  name:   { type: String, required: true },
  cat:    { type: Number, required: true },
  img:    { type: String },
  price:  { type: Number, required: true },
  orig:   { type: Number },
  unit:   { type: String },
  disc:   { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  rev:    { type: Number, default: 0 },
  feat:   { type: Boolean, default: false },
  badge:  { type: String, default: null },
  desc:   { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
