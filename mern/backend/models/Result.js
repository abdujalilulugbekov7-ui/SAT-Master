const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ism: String,
  nomer: String,
  type: { type: String, enum: ['SAT', 'IELTS'], required: true },
  score: { type: String, required: true },
  detail: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
