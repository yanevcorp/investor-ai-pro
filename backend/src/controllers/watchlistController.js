const Watchlist = require('../models/Watchlist');

async function getWatchlist(req, res, next) {
  try {
    let watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      watchlist = await Watchlist.create({ user: req.user._id, symbols: [] });
    }
    res.json({ watchlist });
  } catch (err) {
    next(err);
  }
}

async function addSymbol(req, res, next) {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ message: 'symbol is required' });
    }
    const upperSymbol = symbol.toUpperCase();

    let watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      watchlist = new Watchlist({ user: req.user._id, symbols: [] });
    }

    if (!watchlist.symbols.includes(upperSymbol)) {
      watchlist.symbols.push(upperSymbol);
      await watchlist.save();
    }

    res.status(201).json({ watchlist });
  } catch (err) {
    next(err);
  }
}

async function removeSymbol(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    watchlist.symbols = watchlist.symbols.filter((s) => s !== symbol);
    await watchlist.save();
    res.json({ watchlist });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWatchlist, addSymbol, removeSymbol };
