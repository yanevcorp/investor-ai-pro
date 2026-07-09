const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    symbols: [{ type: String, uppercase: true, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Watchlist', watchlistSchema);
