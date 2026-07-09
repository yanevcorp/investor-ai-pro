const express = require('express');
const { listStocks, getStock } = require('../controllers/stockController');

const router = express.Router();

router.get('/', listStocks);
router.get('/:symbol', getStock);

module.exports = router;
