const jwt = require('jsonwebtoken');
const Agency = require('../models/Agency');
const Staff = require('../models/Staff');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Verify JWT and attach agency/user to req
const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // Check if it's a staff token or agency owner token
  if (decoded.isStaff) {
    const staff = await Staff.findById(decoded.id).select('+refreshToken');
    if (!staff || !staff.isActive) {
      return next(new AppError('Staff account not found or deactivated.', 401));
    }
    req.user = staff;
    req.agency = await Agency.findById(staff.agencyId);
    req.isStaff = true;
    req.staffRole = staff.role;
    req.permissions = staff.permissions;
  } else {
    const agency = await Agency.findById(decoded.id);
    if (!agency || !agency.isActive) {
      return next(new AppError('Agency account not found or deactivated.', 401));
    }
    req.agency = agency;
    req.user = agency;
    req.isStaff = false;
    req.permissions = {
      canCreateRental: true,
      canDeleteRental: true,
      canManageInventory: true,
      canViewReports: true,
      canManagePayments: true,
      canBlacklistCustomer: true,
      canManageStaff: true,
    };
  }

  next();
});

// Restrict to agency owner only (no staff)
const ownerOnly = (req, res, next) => {
  if (req.isStaff) {
    return next(new AppError('Only the agency owner can perform this action.', 403));
  }
  next();
};

// Permission check middleware factory
const requirePermission = (permission) => (req, res, next) => {
  if (!req.isStaff) return next(); // owners have all permissions
  if (!req.permissions || !req.permissions[permission]) {
    return next(new AppError(`You don't have permission to perform this action.`, 403));
  }
  next();
};

// Ensure agency tenant isolation on all queries
// Attaches agencyId to req for use in controllers
const tenantGuard = (req, res, next) => {
  if (!req.agency) {
    return next(new AppError('Tenant context missing.', 401));
  }
  req.agencyId = req.agency._id;
  next();
};

// Plan-based feature gating
const requirePlan = (...plans) => (req, res, next) => {
  const agencyPlan = req.agency?.plan || 'free';
  if (!plans.includes(agencyPlan) && !req.agency?.isInTrial) {
    return next(new AppError(`This feature requires a ${plans.join(' or ')} plan. Please upgrade.`, 403));
  }
  next();
};

module.exports = { protect, ownerOnly, requirePermission, tenantGuard, requirePlan };
