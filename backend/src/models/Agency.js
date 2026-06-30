const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AgencySchema = new mongoose.Schema({
  // Owner info
  ownerName: { type: String, required: [true, 'Owner name is required'], trim: true },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },

  // Agency details
  agencyName: { type: String, required: [true, 'Agency name is required'], trim: true },
  phone: { type: String, required: [true, 'Phone is required'], trim: true },
  alternatePhone: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, default: 'Andhra Pradesh' },
  pincode: { type: String, trim: true },
  gstin: { type: String, trim: true },
  logoUrl: { type: String, default: null },
  logoPublicId: { type: String, default: null },

  // Business type
  businessType: {
    type: String,
    enum: ['bike_rental', 'car_rental', 'vehicle_rental', 'equipment_rental', 'mixed'],
    default: 'mixed',
  },

  // Plan & billing
  plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
  planExpiresAt: { type: Date, default: null },
  razorpayCustomerId: { type: String, default: null },
  trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },

  // Settings
  settings: {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    whatsappEnabled: { type: Boolean, default: false },
    whatsappNumber: { type: String, default: null },
    emailNotifications: { type: Boolean, default: true },
    overdueAlertDays: { type: Number, default: 0 }, // days after due to alert
    depositPolicy: { type: String, default: 'Full deposit required before rental' },
    rentalTerms: { type: String, default: '' },
  },

  // Auth
  refreshToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  emailVerificationToken: { type: String, select: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: is plan active
AgencySchema.virtual('isPlanActive').get(function () {
  if (this.plan === 'free') return true;
  if (!this.planExpiresAt) return false;
  return this.planExpiresAt > new Date();
});

// Virtual: is in trial
AgencySchema.virtual('isInTrial').get(function () {
  return this.trialEndsAt && this.trialEndsAt > new Date();
});

// Indexes
AgencySchema.index({ email: 1 });
AgencySchema.index({ plan: 1 });

// Hash password before save
AgencySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
AgencySchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT access token
AgencySchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, plan: this.plan },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate refresh token
AgencySchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

module.exports = mongoose.model('Agency', AgencySchema);
