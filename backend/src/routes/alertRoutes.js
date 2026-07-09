const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { listAlerts, dismissAlert } = require('../controllers/alertController');

const router = express.Router();

router.use(optionalAuth);

router.get('/', listAlerts);
router.patch('/:id/dismiss', dismissAlert);

module.exports = router;
