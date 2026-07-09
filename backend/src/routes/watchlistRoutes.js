const express = require('express');
const { protect } = require('../middleware/auth');
const { getWatchlist, addSymbol, removeSymbol } = require('../controllers/watchlistController');

const router = express.Router();

router.use(protect);

router.get('/', getWatchlist);
router.post('/', addSymbol);
router.delete('/:symbol', removeSymbol);

module.exports = router;
