const Customer = require('../models/Customer');
const Rental = require('../models/Rental');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @GET /api/customers
exports.getCustomers = catchAsync(async (req, res) => {
  const { search, isBlacklisted, tier, source, city, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const query = { agencyId: req.agencyId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { aadhaarNumber: { $regex: search, $options: 'i' } },
    ];
  }
  if (isBlacklisted !== undefined) query.isBlacklisted = isBlacklisted === 'true';
  if (source) query.source = source;
  if (city) query.city = { $regex: city, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Customer.countDocuments(query);
  const customers = await Customer.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: customers,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  });
});

// @GET /api/customers/:id
exports.getCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!customer) return next(new AppError('Customer not found', 404));

  // Get rental history
  const rentals = await Rental.find({ customerId: customer._id, agencyId: req.agencyId })
    .populate('inventoryId', 'name category registrationNumber')
    .sort('-createdAt')
    .limit(20);

  res.json({ success: true, data: { ...customer.toJSON(), rentalHistory: rentals } });
});

// @POST /api/customers
exports.createCustomer = catchAsync(async (req, res, next) => {
  const { name, phone, alternatePhone, email, dateOfBirth, gender, address, city, state, pincode,
    aadhaarNumber, dlNumber, dlExpiryDate, passportNumber, voterIdNumber,
    tags, internalNotes, referredBy, source } = req.body;

  // Check duplicate phone within agency
  const existing = await Customer.findOne({ agencyId: req.agencyId, phone });
  if (existing) {
    let updated = false;
    const possibleFields = {
      name, alternatePhone, email, dateOfBirth, gender, address, city, state, pincode,
      aadhaarNumber, dlNumber, dlExpiryDate, passportNumber, voterIdNumber,
      tags, internalNotes, referredBy, source
    };
    for (const [key, value] of Object.entries(possibleFields)) {
      if (value !== undefined && value !== null && value !== '') {
        if (existing[key] !== value) {
          existing[key] = value;
          updated = true;
        }
      }
    }
    if (updated) {
      await existing.save({ validateBeforeSave: false });
    }
    return res.status(200).json({
      success: true,
      data: existing,
      message: 'Existing customer details updated and retrieved successfully'
    });
  }

  const customer = await Customer.create({
    agencyId: req.agencyId,
    name, phone, alternatePhone, email, dateOfBirth, gender,
    address, city, state, pincode,
    aadhaarNumber, dlNumber, dlExpiryDate, passportNumber, voterIdNumber,
    tags, internalNotes, referredBy, source,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: customer, message: 'Customer added successfully' });
});

// @PUT /api/customers/:id
exports.updateCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, agencyId: req.agencyId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!customer) return next(new AppError('Customer not found', 404));
  res.json({ success: true, data: customer, message: 'Customer updated' });
});

// @DELETE /api/customers/:id
exports.deleteCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!customer) return next(new AppError('Customer not found', 404));

  // Check for active rentals
  const activeRental = await Rental.findOne({ customerId: customer._id, status: { $in: ['active', 'overdue'] } });
  if (activeRental) return next(new AppError('Cannot delete customer with active rentals', 400));

  // Delete Cloudinary images
  const publicIds = [
    customer.aadhaarFrontPublicId, customer.aadhaarBackPublicId,
    customer.dlFrontPublicId, customer.dlBackPublicId,
    customer.passportPublicId,
  ].filter(Boolean);
  await Promise.all(publicIds.map(id => deleteFromCloudinary(id)));

  await customer.deleteOne();
  res.json({ success: true, message: 'Customer deleted successfully' });
});

// @POST /api/customers/:id/blacklist
exports.toggleBlacklist = catchAsync(async (req, res, next) => {
  const { reason, action } = req.body; // action: 'blacklist' | 'unblacklist'

  const customer = await Customer.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!customer) return next(new AppError('Customer not found', 404));

  if (action === 'blacklist') {
    if (!reason) return next(new AppError('Blacklist reason is required', 400));
    // Check active rentals
    const activeRental = await Rental.findOne({ customerId: customer._id, status: { $in: ['active', 'overdue'] } });
    if (activeRental) return next(new AppError('Cannot blacklist customer with active rentals', 400));

    customer.isBlacklisted = true;
    customer.blacklistReason = reason;
    customer.blacklistedAt = new Date();
    customer.blacklistedBy = req.user._id;
  } else {
    customer.isBlacklisted = false;
    customer.blacklistReason = null;
    customer.blacklistedAt = null;
    customer.blacklistedBy = null;
  }

  await customer.save();
  res.json({ success: true, data: customer, message: `Customer ${action === 'blacklist' ? 'blacklisted' : 'unblacklisted'}` });
});

// @POST /api/customers/:id/upload-id
exports.uploadIdProof = catchAsync(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!customer) return next(new AppError('Customer not found', 404));

  const { idType, side } = req.body; // idType: aadhaar/dl/passport/voterid, side: front/back
  const file = req.file;

  if (!file) return next(new AppError('No file uploaded', 400));

  const fieldMap = {
    aadhaar_front: { url: 'aadhaarFrontUrl', publicId: 'aadhaarFrontPublicId' },
    aadhaar_back: { url: 'aadhaarBackUrl', publicId: 'aadhaarBackPublicId' },
    dl_front: { url: 'dlFrontUrl', publicId: 'dlFrontPublicId' },
    dl_back: { url: 'dlBackUrl', publicId: 'dlBackPublicId' },
    passport_front: { url: 'passportUrl', publicId: 'passportPublicId' },
    passport_back: { url: 'passportBackUrl', publicId: 'passportBackPublicId' },
    voterid_front: { url: 'voterIdUrl', publicId: 'voterIdPublicId' },
    voterid_back: { url: 'voterIdBackUrl', publicId: 'voterIdBackPublicId' },
    passport: { url: 'passportUrl', publicId: 'passportPublicId' },
    voterid: { url: 'voterIdUrl', publicId: 'voterIdPublicId' },
  };

  const key = `${idType}_${side || 'front'}`;
  const fields = fieldMap[key];
  if (!fields) return next(new AppError('Invalid ID type or side', 400));

  // Delete old image if exists
  if (customer[fields.publicId]) {
    await deleteFromCloudinary(customer[fields.publicId]);
  }

  customer[fields.url] = file.path;
  customer[fields.publicId] = file.filename;
  await customer.save();

  res.json({ success: true, data: { url: file.path }, message: 'ID proof uploaded successfully' });
});

// @GET /api/customers/stats
exports.getCustomerStats = catchAsync(async (req, res) => {
  const agencyId = req.agencyId;

  const [total, blacklisted, newThisMonth, tierCounts] = await Promise.all([
    Customer.countDocuments({ agencyId }),
    Customer.countDocuments({ agencyId, isBlacklisted: true }),
    Customer.countDocuments({
      agencyId,
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    }),
    Customer.aggregate([
      { $match: { agencyId } },
      {
        $group: {
          _id: null,
          platinum: { $sum: { $cond: [{ $gte: ['$totalRentals', 10] }, 1, 0] } },
          gold: { $sum: { $cond: [{ $and: [{ $gte: ['$totalRentals', 5] }, { $lt: ['$totalRentals', 10] }] }, 1, 0] } },
          silver: { $sum: { $cond: [{ $and: [{ $gte: ['$totalRentals', 3] }, { $lt: ['$totalRentals', 5] }] }, 1, 0] } },
          new: { $sum: { $cond: [{ $lt: ['$totalRentals', 3] }, 1, 0] } },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      total, blacklisted, newThisMonth,
      tiers: tierCounts[0] || { platinum: 0, gold: 0, silver: 0, new: 0 },
    },
  });
});
