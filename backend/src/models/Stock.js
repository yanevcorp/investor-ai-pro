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
    // Raw Alpha Vantage OVERVIEW response, cached here permanently after
    // the first fetch per symbol — their free tier allows only 25
    // requests/day, so this must not be re-fetched on every request.
    fundamentals: { type: mongoose.Schema.Types.Mixed, default: null },
    fundamentalsFetchedAt: { type: Date, default: null },
    // Daily closes from Alpha Vantage TIME_SERIES_DAILY, oldest first.
    // Same rate-limit reasoning as fundamentals — refetched at most once
    // every 24h, reused for sparklines, drawdown, and correlation calc.
    priceHistory: {
      type: [{ date: String, close: Number, _id: false }],
      default: [],
    },
    priceHistoryFetchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stock', stockSchema);
