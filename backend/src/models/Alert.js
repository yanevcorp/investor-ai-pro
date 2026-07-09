const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['anomaly', 'volume', 'ownership', 'sentiment'],
      default: 'anomaly',
    },
    // Users who dismissed this alert — lets one global alert feed
    // track per-user read state without duplicating documents.
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
