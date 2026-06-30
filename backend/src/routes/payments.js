// routes/payments.js
const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const { protect, tenantGuard } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

router.use(protect, tenantGuard);

// All payments across all rentals (paginated)
router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 30, method, type, startDate, endDate } = req.query;
  const matchQuery = { agencyId: req.agencyId };
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: matchQuery },
    { $unwind: '$payments' },
    ...(method ? [{ $match: { 'payments.method': method } }] : []),
    ...(type ? [{ $match: { 'payments.type': type } }] : []),
    { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $lookup: { from: 'inventories', localField: 'inventoryId', foreignField: '_id', as: 'inventory' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        rentalId: '$_id',
        rentalNumber: 1,
        payment: '$payments',
        customerName: '$customer.name',
        customerPhone: '$customer.phone',
        inventoryName: '$inventory.name',
      },
    },
    { $sort: { 'payment.paidAt': -1 } },
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) },
  ];

  const payments = await Rental.aggregate(pipeline);

  const totals = await Rental.aggregate([
    { $match: matchQuery },
    { $unwind: '$payments' },
    { $match: { 'payments.type': { $ne: 'refund' } } },
    {
      $group: {
        _id: '$payments.method',
        total: { $sum: '$payments.amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  res.json({ success: true, data: payments, totals });
}));

module.exports = router;
