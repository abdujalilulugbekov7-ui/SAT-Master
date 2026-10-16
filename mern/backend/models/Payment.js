const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ism: { type: String, default: '' },
  nomer: { type: String, default: '' },
  plan: { type: String, enum: ['pro', 'max', 'ultra'], required: true },
  amount: { type: Number, required: true }, // so'mda
  provider: { type: String, enum: ['click', 'payme'], default: 'click' },
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  // provider identifikatorlari
  clickTransId: { type: String, default: '' },
  paymeTransId: { type: String, default: '' },
  paymeTime: { type: Number, default: 0 },
  paymeState: { type: Number, default: 1 }, // 1-created, 2-performed, -1,-2 cancelled
  paymeCreateTime: { type: Number, default: 0 },
  paymePerformTime: { type: Number, default: 0 },
  paymeCancelTime: { type: Number, default: 0 },
  paymeReason: { type: Number, default: null },
  errorNote: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
