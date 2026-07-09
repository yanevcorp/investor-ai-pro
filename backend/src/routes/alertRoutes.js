const express = require('express');
const { protect } = require('../middleware/auth');
const { listAlerts, dismissAlert } = require('../controllers/alertController');

const router = express.Router();

router.use(protect);

router.get('/', listAlerts);
router.patch('/:id/dismiss', dismissAlert);

module.exports = router;
