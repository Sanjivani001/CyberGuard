const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  target: { type: String, required: true },
  type: { type: String, enum: ['url','ip'], default: 'url' },
  riskScore: { type: Number, default: 0 },
  raw: { type: Object, default: {} },
  flagged: { type: Boolean, default: false },
  solution: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
