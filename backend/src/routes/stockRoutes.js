const express = require('express');
const { listStocks, getStock, searchStocks, getStockHistory } = require('../controllers/stockController');

const router = express.Router();

router.get('/', listStocks);
router.get('/search', searchStocks);
router.get('/:symbol/history', getStockHistory);
router.get('/:symbol', getStock);

module.exports = router;
