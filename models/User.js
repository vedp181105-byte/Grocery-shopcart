const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  pass:  { type: String, required: true },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('pass')) return next();
  this.pass = await bcrypt.hash(this.pass, 10);
  next();
});

// Compare password
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.pass);
};

module.exports = mongoose.model('User', userSchema);
