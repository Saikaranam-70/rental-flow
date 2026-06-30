// routes/agency.js
const express = require('express');
const router = express.Router();
const Agency = require('../models/Agency');
const { protect, tenantGuard, ownerOnly } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { uploadLogo } = require('../config/cloudinary');

router.use(protect, tenantGuard);

router.get('/profile', catchAsync(async (req, res) => {
  res.json({ success: true, data: req.agency });
}));

router.put('/profile', ownerOnly, catchAsync(async (req, res) => {
  const allowed = ['agencyName', 'ownerName', 'phone', 'alternatePhone', 'address', 'city', 'state', 'pincode', 'gstin', 'businessType', 'settings'];
  const updates = {};
  allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
  const agency = await Agency.findByIdAndUpdate(req.agencyId, updates, { new: true, runValidators: true });
  res.json({ success: true, data: agency, message: 'Profile updated' });
}));

router.post('/logo', ownerOnly, uploadLogo.single('logo'), catchAsync(async (req, res, next) => {
  if (!req.file) return next(new (require('../utils/AppError'))('No file uploaded', 400));
  const agency = await Agency.findByIdAndUpdate(req.agencyId, { logoUrl: req.file.path, logoPublicId: req.file.filename }, { new: true });
  res.json({ success: true, data: { logoUrl: agency.logoUrl }, message: 'Logo uploaded' });
}));

router.post('/test-sales-report', ownerOnly, catchAsync(async (req, res) => {
  const Rental = require('../models/Rental');
  const { sendMetaWhatsApp } = require('../jobs/alertHandlers');

  const agency = req.agency;
  const ownerPhone = agency.settings?.whatsappNumber || agency.phone;
  if (!ownerPhone) {
    return res.status(400).json({ success: false, message: 'Owner WhatsApp phone number is not configured' });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const rentalsCreatedToday = await Rental.countDocuments({
    agencyId: agency._id,
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });

  const rentalsWithTodayPayments = await Rental.find({
    agencyId: agency._id,
    'payments.paidAt': { $gte: startOfToday, $lte: endOfToday }
  });

  let totalCollected = 0;
  let totalRefunded = 0;
  let transactionsCount = 0;

  for (const rental of rentalsWithTodayPayments) {
    const todayPayments = rental.payments.filter(
      p => p.paidAt >= startOfToday && p.paidAt <= endOfToday
    );
    for (const p of todayPayments) {
      if (p.type === 'refund') totalRefunded += p.amount;
      else totalCollected += p.amount;
      transactionsCount++;
    }
  }

  const netRevenue = totalCollected - totalRefunded;

  const activeRentalsCount = await Rental.countDocuments({ agencyId: agency._id, status: 'active' });
  const overdueRentalsCount = await Rental.countDocuments({ agencyId: agency._id, status: 'overdue' });

  const reportMessage = `📊 *TEST SALES SUMMARY - ${agency.agencyName.toUpperCase()}*\n` +
    `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
    `📈 *Performance Metrics:*\n` +
    `• New Bookings today: *${rentalsCreatedToday}*\n` +
    `• Collections today: *₹${totalCollected}*\n` +
    `• Refunds today: *₹${totalRefunded}*\n` +
    `• *Net Revenue today: ₹${netRevenue}*\n` +
    `• Total transactions: *${transactionsCount}*\n\n` +
    `🏍️ *Fleet Operations Status:*\n` +
    `• Active rentals ongoing: *${activeRentalsCount}*\n` +
    `• Overdue returns pending: *${overdueRentalsCount}*\n\n` +
    `🚀 _Sent automatically via RentalFlow CRM_`;

  try {
    await sendMetaWhatsApp(ownerPhone, reportMessage);
    res.json({ success: true, message: `Test report successfully sent to ${ownerPhone}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: `WhatsApp API error: ${err.message}` });
  }
}));

module.exports = router;
