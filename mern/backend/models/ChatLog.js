const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ism: { type: String, default: '' },
  nomer: { type: String, default: '' },
  mode: { type: String, default: 'SAT' },
  question: { type: String, required: true },
  reply: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ChatLog', ChatLogSchema);
