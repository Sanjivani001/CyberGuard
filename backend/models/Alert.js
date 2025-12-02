const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    input: { type: String, required: true },
    type: { type: String }, // IP or URL
    riskScore: { type: Number },
    details: { type: Object }, // IPQS API result
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
