const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    holdings: [holdingSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
