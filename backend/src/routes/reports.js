// routes/reports.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/reportController');
const { protect, tenantGuard, requirePlan } = require('../middleware/auth');

router.use(protect, tenantGuard);
router.get('/overview', c.getOverview);
router.get('/export/rentals', requirePlan('basic', 'pro', 'enterprise'), c.exportRentalsCSV);
router.get('/export/customers', requirePlan('basic', 'pro', 'enterprise'), c.exportCustomersCSV);

module.exports = router;
