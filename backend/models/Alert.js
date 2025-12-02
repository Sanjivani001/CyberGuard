const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  target: { type: String, required: true }, // URL or IP scanned
  type: { type: String, enum: ['url','ip'], default: 'url' },
  riskScore: { type: Number, default: 0 },
  raw: { type: Object, default: {} }, // full IPQS response
  flagged: { type: Boolean, default: false } // true if riskScore >= threshold
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
