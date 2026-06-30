const Rental = require('../models/Rental');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const catchAsync = require('../utils/catchAsync');

// @GET /api/reports/overview
exports.getOverview = catchAsync(async (req, res) => {
  const agencyId = req.agencyId;
  const { year = new Date().getFullYear(), month } = req.query;

  // Monthly revenue for the year
  const monthlyRevenue = await Rental.aggregate([
    {
      $match: {
        agencyId,
        status: 'returned',
        updatedAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$updatedAt' },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill all 12 months
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyRevenue.find(m => m._id === i + 1);
    return { month: i + 1, revenue: found?.revenue || 0, count: found?.count || 0 };
  });

  // Top performing vehicles
  const topInventory = await Rental.aggregate([
    { $match: { agencyId, status: 'returned' } },
    { $group: { _id: '$inventoryId', totalRevenue: { $sum: '$totalAmount' }, totalRentals: { $sum: 1 } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'inventories', localField: '_id', foreignField: '_id', as: 'inventory' } },
    { $unwind: '$inventory' },
    { $project: { name: '$inventory.name', category: '$inventory.category', totalRevenue: 1, totalRentals: 1 } },
  ]);

  // Top customers
  const topCustomers = await Customer.find({ agencyId })
    .sort('-totalAmountPaid')
    .limit(5)
    .select('name phone totalRentals totalAmountPaid tier');

  // Payment method breakdown
  const paymentMethods = await Rental.aggregate([
    { $match: { agencyId } },
    { $unwind: '$payments' },
    { $match: { 'payments.type': { $ne: 'refund' } } },
    { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  // Status breakdown
  const statusBreakdown = await Rental.aggregate([
    { $match: { agencyId } },
    { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
  ]);

  // Category breakdown
  const categoryBreakdown = await Rental.aggregate([
    { $match: { agencyId } },
    { $lookup: { from: 'inventories', localField: 'inventoryId', foreignField: '_id', as: 'inv' } },
    { $unwind: '$inv' },
    { $group: { _id: '$inv.category', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { revenue: -1 } },
  ]);

  // KPIs
  const [totalStats] = await Rental.aggregate([
    { $match: { agencyId } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalRentals: { $sum: 1 },
        avgRentalValue: { $avg: '$totalAmount' },
        avgRentalDays: { $avg: '$totalDays' },
        totalPenalty: { $sum: '$penaltyAmount' },
      },
    },
  ]);

  const overdueRate = await (async () => {
    const total = await Rental.countDocuments({ agencyId });
    const overdue = await Rental.countDocuments({ agencyId, status: 'overdue' });
    return total ? Math.round((overdue / total) * 100) : 0;
  })();

  res.json({
    success: true,
    data: {
      monthlyRevenue: monthlyData,
      topInventory,
      topCustomers,
      paymentMethods,
      statusBreakdown,
      categoryBreakdown,
      kpis: {
        ...(totalStats || { totalRevenue: 0, totalRentals: 0, avgRentalValue: 0, avgRentalDays: 0, totalPenalty: 0 }),
        overdueRate,
      },
    },
  });
});

// @GET /api/reports/export/rentals
exports.exportRentalsCSV = catchAsync(async (req, res) => {
  const { startDate, endDate, status } = req.query;

  const query = { agencyId: req.agencyId };
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const rentals = await Rental.find(query)
    .populate('customerId', 'name phone email aadhaarNumber')
    .populate('inventoryId', 'name registrationNumber category')
    .sort('-createdAt')
    .limit(5000);

  const headers = [
    'Rental No', 'Customer Name', 'Phone', 'Vehicle', 'Registration',
    'Start Date', 'Expected Return', 'Actual Return', 'Days', 'Daily Rate',
    'Base Amount', 'Penalty', 'Discount', 'Total Amount', 'Amount Paid',
    'Deposit', 'Deposit Returned', 'Status', 'Notes', 'Created At',
  ];

  const rows = rentals.map(r => [
    r.rentalNumber,
    r.customerId?.name || '',
    r.customerId?.phone || '',
    r.inventoryId?.name || '',
    r.inventoryId?.registrationNumber || '',
    r.startDate?.toISOString().split('T')[0] || '',
    r.expectedReturnDate?.toISOString().split('T')[0] || '',
    r.actualReturnDate?.toISOString().split('T')[0] || '',
    r.totalDays,
    r.dailyRate,
    r.baseAmount,
    r.penaltyAmount || 0,
    r.discountAmount || 0,
    r.totalAmount,
    r.amountPaid || 0,
    r.depositAmount,
    r.depositReturned || 0,
    r.status,
    r.notes || '',
    r.createdAt?.toISOString().split('T')[0] || '',
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=rentals-${Date.now()}.csv`);
  res.send(csv);
});

// @GET /api/reports/export/customers
exports.exportCustomersCSV = catchAsync(async (req, res) => {
  const customers = await Customer.find({ agencyId: req.agencyId }).sort('-createdAt').limit(5000);

  const headers = [
    'Name', 'Phone', 'Alt Phone', 'Email', 'City', 'Address',
    'Aadhaar', 'DL Number', 'Total Rentals', 'Total Paid',
    'Status', 'Source', 'Joined',
  ];

  const rows = customers.map(c => [
    c.name, c.phone, c.alternatePhone || '', c.email || '',
    c.city || '', c.address || '', c.aadhaarNumber || '', c.dlNumber || '',
    c.totalRentals, c.totalAmountPaid,
    c.isBlacklisted ? 'Blacklisted' : 'Active',
    c.source, c.createdAt?.toISOString().split('T')[0],
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=customers-${Date.now()}.csv`);
  res.send(csv);
});
