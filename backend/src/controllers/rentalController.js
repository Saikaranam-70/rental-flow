const Rental = require('../models/Rental');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { addToAlertQueue } = require('../jobs/queueManager');

const calcDays = (start, end) => Math.max(1, Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)));

// @GET /api/rentals
exports.getRentals = catchAsync(async (req, res) => {
  const { status, customerId, inventoryId, page = 1, limit = 20, sort = '-createdAt',
    startDate, endDate, search } = req.query;

  const query = { agencyId: req.agencyId };
  if (status) {
    query.status = status.includes(',') ? { $in: status.split(',') } : status;
  }
  if (customerId) query.customerId = customerId;
  if (inventoryId) query.inventoryId = inventoryId;
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Rental.countDocuments(query);

  let rentalsQuery = Rental.find(query)
    .populate('customerId', 'name phone email avatar isBlacklisted')
    .populate('inventoryId', 'name category registrationNumber photos dailyRate')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  if (search) {
    // search by rental number
    query.rentalNumber = { $regex: search, $options: 'i' };
  }

  const rentals = await rentalsQuery;

  res.json({
    success: true,
    data: rentals,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
  });
});

// @GET /api/rentals/dashboard
exports.getDashboardStats = catchAsync(async (req, res) => {
  const agencyId = req.agencyId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeCount, overdueCount, returnedCount,
    monthRevenue, depositHeld, todayRentals,
    overdueList, upcomingReturns,
  ] = await Promise.all([
    Rental.countDocuments({ agencyId, status: 'active' }),
    Rental.countDocuments({ agencyId, status: 'overdue' }),
    Rental.countDocuments({ agencyId, status: 'returned', updatedAt: { $gte: startOfMonth } }),

    // This month's revenue from returned rentals
    Rental.aggregate([
      { $match: { agencyId, status: 'returned', updatedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    // Total deposit held (active + overdue)
    Rental.aggregate([
      { $match: { agencyId, status: { $in: ['active', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$depositAmount' } } },
    ]),

    // Rentals created today
    Rental.countDocuments({
      agencyId,
      createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) },
    }),

    // Overdue rentals with customer & inventory
    Rental.find({ agencyId, status: 'overdue' })
      .populate('customerId', 'name phone')
      .populate('inventoryId', 'name registrationNumber')
      .sort('expectedReturnDate')
      .limit(10),

    // Returning in next 2 days
    Rental.find({
      agencyId, status: 'active',
      expectedReturnDate: {
        $gte: now,
        $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    })
      .populate('customerId', 'name phone')
      .populate('inventoryId', 'name')
      .sort('expectedReturnDate')
      .limit(5),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        activeRentals: activeCount,
        overdueRentals: overdueCount,
        returnedThisMonth: returnedCount,
        monthRevenue: monthRevenue[0]?.total || 0,
        depositHeld: depositHeld[0]?.total || 0,
        todayRentals,
      },
      overdueList,
      upcomingReturns,
    },
  });
});

// @GET /api/rentals/:id
exports.getRental = catchAsync(async (req, res, next) => {
  const rental = await Rental.findOne({ _id: req.params.id, agencyId: req.agencyId })
    .populate('customerId')
    .populate('inventoryId');
  if (!rental) return next(new AppError('Rental not found', 404));
  res.json({ success: true, data: rental });
});

// @POST /api/rentals
// @POST /api/rentals
exports.createRental = catchAsync(async (req, res, next) => {
  const { customerId, inventoryId, startDate, expectedReturnDate, notes,
    startOdometer, discountAmount, customerDetails } = req.body;

  if ((!customerId && !customerDetails) || !inventoryId || !startDate || !expectedReturnDate) {
    return next(new AppError('Customer/Customer Details, inventory, start date and return date are required', 400));
  }

  // Find or Create Customer
  let customer;
  if (customerId && customerId !== 'new') {
    customer = await Customer.findOne({ _id: customerId, agencyId: req.agencyId });
  } else if (customerDetails) {
    const { name, phone, email, address, city, aadhaarNumber, dlNumber } = customerDetails;
    if (!name || !phone) {
      return next(new AppError('Customer name and phone number are required', 400));
    }
    // Check if customer already exists for this agency by phone
    customer = await Customer.findOne({ phone: phone.trim(), agencyId: req.agencyId });
    if (!customer) {
      customer = await Customer.create({
        agencyId: req.agencyId,
        name,
        phone: phone.trim(),
        email: email || null,
        address,
        city,
        aadhaarNumber,
        dlNumber,
        createdBy: req.user?._id,
      });
    } else {
      // Reuse customer and update details if newer details are provided
      let updated = false;
      if (name && customer.name !== name) { customer.name = name; updated = true; }
      if (email && customer.email !== email) { customer.email = email; updated = true; }
      if (address && customer.address !== address) { customer.address = address; updated = true; }
      if (city && customer.city !== city) { customer.city = city; updated = true; }
      if (aadhaarNumber && customer.aadhaarNumber !== aadhaarNumber) { customer.aadhaarNumber = aadhaarNumber; updated = true; }
      if (dlNumber && customer.dlNumber !== dlNumber) { customer.dlNumber = dlNumber; updated = true; }
      if (customerDetails.passportNumber && customer.passportNumber !== customerDetails.passportNumber) { customer.passportNumber = customerDetails.passportNumber; updated = true; }
      if (customerDetails.voterIdNumber && customer.voterIdNumber !== customerDetails.voterIdNumber) { customer.voterIdNumber = customerDetails.voterIdNumber; updated = true; }
      if (updated) await customer.save({ validateBeforeSave: false });
    }
  }

  if (!customer) {
    return next(new AppError('Customer not found or invalid customer details provided', 404));
  }
  if (customer.isBlacklisted) {
    return next(new AppError('This customer is blacklisted and cannot rent', 403));
  }

  const resolvedCustomerId = customer._id;

  // Validate inventory
  let inventory;
  if (inventoryId === 'new' && req.body.vehicleDetails) {
    const { name, dailyRate, depositAmount } = req.body.vehicleDetails;
    if (!name || !dailyRate || !depositAmount) {
      return next(new AppError('Vehicle name, daily rate, and deposit amount are required', 400));
    }
    inventory = await Inventory.create({
      ...req.body.vehicleDetails,
      agencyId: req.agencyId,
      status: 'available',
    });
  } else {
    inventory = await Inventory.findOne({ _id: inventoryId, agencyId: req.agencyId });
  }

  if (!inventory) return next(new AppError('Vehicle/item not found', 404));
  
  if (inventory.status !== 'available') {
    return next(new AppError(`This item is currently ${inventory.status}`, 400));
  }

  // Check insurance expiry
  if (inventoryId !== 'new' && inventory.isInsuranceExpired) {
    return next(new AppError('Cannot rent — insurance is expired for this vehicle', 400));
  }

  const days = calcDays(startDate, expectedReturnDate);
  const baseAmount = days * inventory.dailyRate;
  const discount = parseFloat(discountAmount) || 0;
  const totalAmount = baseAmount - discount;

  const rental = await Rental.create({
    agencyId: req.agencyId,
    customerId: resolvedCustomerId,
    inventoryId: inventory._id,
    startDate: new Date(startDate),
    expectedReturnDate: new Date(expectedReturnDate),
    totalDays: days,
    dailyRate: inventory.dailyRate,
    depositAmount: inventory.depositAmount,
    baseAmount,
    discountAmount: discount,
    totalAmount,
    amountPending: totalAmount + inventory.depositAmount,
    startOdometer,
    notes,
    createdBy: req.user._id,
    payments: [], // deposit collected separately via payment route
  });

  // Update inventory status
  await Inventory.findByIdAndUpdate(inventory._id, { status: 'rented' });

  // Update customer stats
  await Customer.findByIdAndUpdate(resolvedCustomerId, {
    $inc: { totalRentals: 1 },
    lastRentalDate: new Date(),
  });

  // Queue confirmation notification (non-blocking)
  addToAlertQueue({
    type: 'rental_created',
    rentalId: rental._id,
    agencyId: req.agencyId,
    customerId: resolvedCustomerId,
  }).catch(err => console.error('Alert queue error (created):', err));

  const populated = await rental.populate([
    { path: 'customerId', select: 'name phone email' },
    { path: 'inventoryId', select: 'name category registrationNumber' },
  ]);

  res.status(201).json({ success: true, data: populated, message: 'Rental created successfully' });
});

// @POST /api/rentals/:id/payment
exports.addPayment = catchAsync(async (req, res, next) => {
  const { amount, method, type, reference, note } = req.body;

  if (!amount || !method || !type) return next(new AppError('Amount, method and type required', 400));

  const rental = await Rental.findOne({ _id: req.params.id, agencyId: req.agencyId });
  if (!rental) return next(new AppError('Rental not found', 404));
  if (rental.status === 'returned') return next(new AppError('Cannot add payment to returned rental', 400));

  rental.payments.push({
    amount: parseFloat(amount),
    method, type, reference, note,
    collectedBy: req.user._id,
    paidAt: new Date(),
  });

  await rental.save();

  res.json({ success: true, data: rental, message: 'Payment recorded successfully' });
});

// @POST /api/rentals/:id/return
exports.processReturn = catchAsync(async (req, res, next) => {
  const { actualReturnDate, endOdometer, depositReturned, penaltyAmount,
    penaltyReason, returnNotes, paymentMethod } = req.body;

  const rental = await Rental.findOne({
    _id: req.params.id,
    agencyId: req.agencyId,
    status: { $in: ['active', 'overdue'] },
  });
  if (!rental) return next(new AppError('Active rental not found', 404));

  const returnDate = actualReturnDate ? new Date(actualReturnDate) : new Date();
  const actualDays = calcDays(rental.startDate, returnDate);
  const extraDays = Math.max(0, actualDays - rental.totalDays);
  const lateFee = extraDays * (rental.lateFeePerDay || rental.dailyRate);
  let penalty = parseFloat(penaltyAmount);
  if (isNaN(penalty)) {
    penalty = lateFee;
  }

  const finalAmount = (actualDays * rental.dailyRate) + penalty - rental.discountAmount;
  const totalPaid = rental.payments.filter(p => p.type !== 'refund').reduce((s, p) => s + p.amount, 0);
  const remainingRental = Math.max(0, finalAmount - totalPaid + rental.depositAmount);

  // Add final payment entry if there's balance due
  const newPayments = [...rental.payments];
  if (remainingRental > 0) {
    newPayments.push({
      amount: remainingRental,
      method: paymentMethod || 'cash',
      type: 'rental',
      note: `Final settlement on return`,
      collectedBy: req.user._id,
      paidAt: new Date(),
    });
  }

  // Deposit refund entry
  let depositReturn = parseFloat(depositReturned);
  if (isNaN(depositReturn)) {
    depositReturn = rental.depositAmount || 0;
  }
  if (depositReturn > 0) {
    newPayments.push({
      amount: depositReturn,
      method: paymentMethod || 'cash',
      type: 'refund',
      note: 'Deposit refunded on return',
      collectedBy: req.user._id,
      paidAt: new Date(),
    });
  }

  Object.assign(rental, {
    status: 'returned',
    actualReturnDate: returnDate,
    extraDays,
    penaltyAmount: penalty,
    totalAmount: finalAmount,
    depositReturned: depositReturn,
    depositReturnDate: new Date(),
    endOdometer,
    returnNotes,
    payments: newPayments,
    closedBy: req.user._id,
    closedAt: new Date(),
  });

  await rental.save();

  // Free up inventory
  await Inventory.findByIdAndUpdate(rental.inventoryId, {
    status: 'available',
    $inc: { totalRentals: 1, totalRevenue: finalAmount, totalRentedDays: actualDays },
    ...(endOdometer && { currentOdometer: endOdometer }),
  });

  // Update customer stats
  await Customer.findByIdAndUpdate(rental.customerId, {
    $inc: { totalAmountPaid: finalAmount },
  });

  // Queue return confirmation (non-blocking)
  addToAlertQueue({
    type: 'rental_returned',
    rentalId: rental._id,
    agencyId: req.agencyId,
    customerId: rental.customerId,
  }).catch(err => console.error('Alert queue error (returned):', err));

  res.json({ success: true, data: rental, message: 'Return processed successfully' });
});

// @POST /api/rentals/:id/extend
exports.extendRental = catchAsync(async (req, res, next) => {
  const { newReturnDate, reason } = req.body;

  const rental = await Rental.findOne({
    _id: req.params.id,
    agencyId: req.agencyId,
    status: { $in: ['active', 'overdue'] },
  });
  if (!rental) return next(new AppError('Active rental not found', 404));

  const prevReturn = rental.expectedReturnDate;
  const additionalDays = calcDays(prevReturn, newReturnDate);
  if (additionalDays <= 0) return next(new AppError('New return date must be after current expected date', 400));

  const additionalAmount = additionalDays * rental.dailyRate;

  rental.extensions.push({
    previousReturnDate: prevReturn,
    newReturnDate: new Date(newReturnDate),
    additionalDays,
    additionalAmount,
    reason,
    extendedBy: req.user._id,
  });

  rental.expectedReturnDate = new Date(newReturnDate);
  rental.totalDays += additionalDays;
  rental.extensionAmount += additionalAmount;
  rental.totalAmount += additionalAmount;
  rental.status = 'active'; // reset overdue if extended
  await rental.save();

  res.json({ success: true, data: rental, message: `Rental extended by ${additionalDays} days` });
});

// @GET /api/rentals/overdue - cron-safe overdue check
exports.checkAndUpdateOverdue = catchAsync(async (req, res) => {
  const result = await Rental.updateMany(
    {
      agencyId: req.agencyId,
      status: 'active',
      expectedReturnDate: { $lt: new Date() },
    },
    { $set: { status: 'overdue' } }
  );
  res.json({ success: true, updated: result.modifiedCount });
});

// @DELETE /api/rentals/:id  (cancel only, not returned)
exports.cancelRental = catchAsync(async (req, res, next) => {
  const rental = await Rental.findOne({ _id: req.params.id, agencyId: req.agencyId, status: 'active' });
  if (!rental) return next(new AppError('Active rental not found', 404));

  rental.status = 'cancelled';
  rental.closedBy = req.user._id;
  rental.closedAt = new Date();
  await rental.save();

  // Free up inventory
  await Inventory.findByIdAndUpdate(rental.inventoryId, { status: 'available' });
  // Decrement customer rental count
  await Customer.findByIdAndUpdate(rental.customerId, { $inc: { totalRentals: -1 } });

  res.json({ success: true, message: 'Rental cancelled successfully' });
});
