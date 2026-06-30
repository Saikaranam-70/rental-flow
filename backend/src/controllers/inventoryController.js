const Inventory = require('../models/Inventory');
const Rental = require('../models/Rental');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @GET /api/inventory
exports.getInventory = catchAsync(async (req, res) => {
  const { status, category, page = 1, limit = 20, sort = '-createdAt', search } = req.query;
  const query = { agencyId: req.agencyId, isActive: true };

  if (status) query.status = status.includes(',') ? { $in: status.split(',') } : status;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Inventory.countDocuments(query);
  const items = await Inventory.find(query).sort(sort).skip(skip).limit(parseInt(limit));

  res.json({
    success: true,
    data: items,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
  });
});

// @GET /api/inventory/stats
exports.getInventoryStats = catchAsync(async (req, res) => {
  const stats = await Inventory.aggregate([
    { $match: { agencyId: req.agencyId, isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalRevenue' },
      },
    },
  ]);

  const categoryStats = await Inventory.aggregate([
    { $match: { agencyId: req.agencyId, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  // Items with expiring documents (next 30 days)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringDocs = await Inventory.find({
    agencyId: req.agencyId,
    $or: [
      { insuranceExpiryDate: { $lte: thirtyDaysFromNow, $gt: new Date() } },
      { pucExpiryDate: { $lte: thirtyDaysFromNow, $gt: new Date() } },
    ],
  }).select('name registrationNumber insuranceExpiryDate pucExpiryDate');

  res.json({ success: true, data: { stats, categoryStats, expiringDocs } });
});

// @GET /api/inventory/:id
exports.getInventoryItem = catchAsync(async (req, res, next) => {
  const item = await Inventory.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!item) return next(new AppError('Item not found', 404));

  const recentRentals = await Rental.find({ inventoryId: item._id, agencyId: req.agencyId })
    .populate('customerId', 'name phone')
    .sort('-createdAt')
    .limit(10);

  res.json({ success: true, data: { ...item.toJSON(), recentRentals } });
});

// @POST /api/inventory
exports.createInventory = catchAsync(async (req, res) => {
  const item = await Inventory.create({ ...req.body, agencyId: req.agencyId });
  res.status(201).json({ success: true, data: item, message: 'Item added to fleet' });
});

// @PUT /api/inventory/:id
exports.updateInventory = catchAsync(async (req, res, next) => {
  const item = await Inventory.findOneAndUpdate(
    { _id: req.params.id, agencyId: req.agencyId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!item) return next(new AppError('Item not found', 404));
  res.json({ success: true, data: item, message: 'Item updated' });
});

// @DELETE /api/inventory/:id
exports.deleteInventory = catchAsync(async (req, res, next) => {
  const item = await Inventory.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!item) return next(new AppError('Item not found', 404));

  const activeRental = await Rental.findOne({ inventoryId: item._id, status: { $in: ['active', 'overdue'] } });
  if (activeRental) return next(new AppError('Cannot delete item with active rentals', 400));

  // Soft delete
  item.isActive = false;
  item.status = 'retired';
  await item.save();

  res.json({ success: true, message: 'Item retired from fleet' });
});

// @POST /api/inventory/:id/photo
exports.uploadPhoto = catchAsync(async (req, res, next) => {
  const item = await Inventory.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!item) return next(new AppError('Item not found', 404));
  if (!req.file) return next(new AppError('No file uploaded', 400));

  const isPrimary = item.photos.length === 0 || req.body.isPrimary === 'true';
  if (isPrimary) {
    item.photos.forEach(p => p.isPrimary = false);
  }

  item.photos.push({ url: req.file.path, publicId: req.file.filename, isPrimary });
  await item.save();

  res.json({ success: true, data: item, message: 'Photo uploaded' });
});

// @POST /api/inventory/:id/maintenance
exports.addMaintenanceLog = catchAsync(async (req, res, next) => {
  const item = await Inventory.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!item) return next(new AppError('Item not found', 404));

  item.maintenanceLogs.push(req.body);
  item.lastServiceDate = new Date();
  if (req.body.nextServiceDate) item.nextServiceDate = new Date(req.body.nextServiceDate);
  if (req.body.status) item.status = req.body.status;
  await item.save();

  res.json({ success: true, data: item, message: 'Maintenance log added' });
});
