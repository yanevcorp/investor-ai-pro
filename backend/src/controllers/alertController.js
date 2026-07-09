const Alert = require('../models/Alert');

async function listAlerts(req, res, next) {
  try {
    const { priority, symbol } = req.query;
    const filter = {};
    if (priority) filter.priority = priority;
    if (symbol) filter.symbol = symbol.toUpperCase();

    const alerts = await Alert.find(filter).sort('-createdAt');

    const shaped = alerts.map((alert) => {
      const obj = alert.toObject();
      obj.dismissed = alert.dismissedBy.some((id) => id.equals(req.user._id));
      delete obj.dismissedBy;
      return obj;
    });

    res.json({ count: shaped.length, alerts: shaped });
  } catch (err) {
    next(err);
  }
}

async function dismissAlert(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    if (!alert.dismissedBy.some((id) => id.equals(req.user._id))) {
      alert.dismissedBy.push(req.user._id);
      await alert.save();
    }

    res.json({ message: 'Alert dismissed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAlerts, dismissAlert };
