const crypto = require('crypto');
const Agency = require('../models/Agency');
const Staff = require('../models/Staff');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../utils/email');
const logger = require('../config/logger');

const sendTokenResponse = (agency, statusCode, res) => {
  const accessToken = agency.generateAccessToken();
  const refreshToken = agency.generateRefreshToken();

  // Save refresh token to DB
  agency.refreshToken = refreshToken;
  agency.lastLoginAt = new Date();
  agency.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: agency._id,
      ownerName: agency.ownerName,
      email: agency.email,
      agencyName: agency.agencyName,
      phone: agency.phone,
      plan: agency.plan,
      logoUrl: agency.logoUrl,
      settings: agency.settings,
      isEmailVerified: agency.isEmailVerified,
      trialEndsAt: agency.trialEndsAt,
      planExpiresAt: agency.planExpiresAt,
    },
  });
};

// @POST /api/auth/register
exports.register = catchAsync(async (req, res, next) => {
  const { ownerName, email, password, agencyName, phone, city, businessType } = req.body;

  if (!ownerName || !email || !password || !agencyName || !phone) {
    return next(new AppError('Please provide all required fields', 400));
  }

  const existing = await Agency.findOne({ email: email.toLowerCase() });
  if (existing) return next(new AppError('An account with this email already exists', 409));

  const agency = await Agency.create({
    ownerName, email, password, agencyName, phone, city, businessType,
  });

  // Send welcome + verification email
  const verifyToken = crypto.randomBytes(32).toString('hex');
  agency.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  await agency.save({ validateBeforeSave: false });

  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    await sendEmail({
      to: agency.email,
      subject: 'Welcome to RentFlow — Verify your email',
      template: 'welcome',
      data: { ownerName: agency.ownerName, agencyName: agency.agencyName, verifyUrl },
    });
  } catch (err) {
    logger.error('Welcome email failed:', err);
  }

  logger.info(`New agency registered: ${agency.agencyName} (${agency.email})`);
  sendTokenResponse(agency, 201, res);
});

// @POST /api/auth/login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, passwordLength: password?.length, password });

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const agency = await Agency.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  console.log('Agency found in DB:', agency ? { id: agency._id, email: agency.email, isActive: agency.isActive } : 'null');
  if (!agency || !(await agency.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (!agency.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 401));
  }

  logger.info(`Agency login: ${agency.email}`);
  sendTokenResponse(agency, 200, res);
});

// @POST /api/auth/staff/login
exports.staffLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Email and password required', 400));

  const staff = await Staff.findOne({ email: email.toLowerCase() }).select('+password');
  if (!staff || !(await staff.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (!staff.isActive) return next(new AppError('Your account has been deactivated', 401));

  const accessToken = staff.generateAccessToken();
  staff.lastLoginAt = new Date();
  await staff.save({ validateBeforeSave: false });

  const agency = await Agency.findById(staff.agencyId);

  res.json({
    success: true,
    accessToken,
    user: {
      id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions,
      agencyId: staff.agencyId,
      agencyName: agency?.agencyName,
      isStaff: true,
    },
  });
});

// @POST /api/auth/refresh
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError('Refresh token required', 400));

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  const agency = await Agency.findById(decoded.id).select('+refreshToken');
  if (!agency || agency.refreshToken !== refreshToken) {
    return next(new AppError('Invalid refresh token', 401));
  }

  sendTokenResponse(agency, 200, res);
});

// @POST /api/auth/forgot-password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const agency = await Agency.findOne({ email: email?.toLowerCase() });

  // Always send success to prevent email enumeration
  if (!agency) {
    return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  agency.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  agency.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await agency.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      to: agency.email,
      subject: 'RentFlow — Reset your password',
      template: 'resetPassword',
      data: { ownerName: agency.ownerName, resetUrl },
    });
  } catch (err) {
    agency.passwordResetToken = undefined;
    agency.passwordResetExpires = undefined;
    await agency.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send reset email. Please try again.', 500));
  }

  res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
});

// @POST /api/auth/reset-password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const agency = await Agency.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!agency) return next(new AppError('Invalid or expired reset token', 400));

  agency.password = password;
  agency.passwordResetToken = undefined;
  agency.passwordResetExpires = undefined;
  await agency.save();

  sendTokenResponse(agency, 200, res);
});

// @POST /api/auth/verify-email
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const agency = await Agency.findOne({ emailVerificationToken: hashedToken });
  if (!agency) return next(new AppError('Invalid verification token', 400));

  agency.isEmailVerified = true;
  agency.emailVerificationToken = undefined;
  await agency.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully' });
});

// @POST /api/auth/logout
exports.logout = catchAsync(async (req, res) => {
  if (req.agency) {
    await Agency.findByIdAndUpdate(req.agency._id, { refreshToken: null });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// @GET /api/auth/me
exports.getMe = catchAsync(async (req, res) => {
  const agency = await Agency.findById(req.agency._id);
  res.json({ success: true, data: agency });
});
