const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true },
    sector: { type: String, default: '' },
    price: { type: Number, required: true },
    change: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    verdict: {
      type: String,
      enum: ['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'],
      required: true,
    },
    aiScore: { type: Number, min: 0, max: 100, required: true },
    // Nested XAI reasons, probability breakdowns and per-tab metric lists —
    // shape mirrors the frontend's analysisDetails so the API can be
    // consumed directly without a transform layer.
    analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stock', stockSchema);
