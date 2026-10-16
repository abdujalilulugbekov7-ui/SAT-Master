const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  ism: { type: String, required: true, trim: true },
  nomer: { type: String, required: true, unique: true }, // 9 ta raqam (+998 siz)
  // Shaxsiy kirish kodi — UM فهمRBOD saqlanadi, hech qachon avtomatik o'chmaydi.
  // Faqat ADMIN paneldagi "Tozalash" tugmasi orqali o'chiriladi.
  code: { type: String, required: true, unique: true }, // 4 xonali shaxsiy kod (umrbod)
  plan: { type: String, enum: ['free', 'pro', 'max', 'ultra'], default: 'free' },
  hearts: { type: Number, default: 3 },
  lastReset: { type: String, default: '' }, // YYYY-MM-DD
  refillUntil: { type: Number, default: 0 }, // timestamp ms
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastDaily: { type: String, default: '' },
  dailyDone: { type: Map, of: Number, default: {} },
  lastCard: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
