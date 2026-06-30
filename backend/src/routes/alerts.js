// routes/alerts.js
const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');
const { protect, tenantGuard } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { addToAlertQueue } = require('../jobs/queueManager');

router.use(protect, tenantGuard);

router.get('/', catchAsync(async (req, res) => {
  const alerts = await AlertLog.find({ agencyId: req.agencyId })
    .populate('customerId', 'name phone')
    .sort('-createdAt')
    .limit(50);
  res.json({ success: true, data: alerts });
}));

router.post('/send-overdue', catchAsync(async (req, res) => {
  const { rentalId } = req.body;
  await addToAlertQueue({ type: 'overdue_whatsapp', rentalId, agencyId: req.agencyId });
  res.json({ success: true, message: 'Alert queued' });
}));

module.exports = router;

