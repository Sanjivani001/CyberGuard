const mongoose = require("mongoose");

const ScanSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    riskScore: { type: Number, required: true },
    status: { type: String, default: "scanned" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("scan", ScanSchema);
