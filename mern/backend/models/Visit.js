const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ism: String,
  nomer: String,
  type: { type: String, enum: ['SAT', 'IELTS'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Visit', VisitSchema);
