const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },

  // Personal info
  name: { type: String, required: [true, 'Customer name is required'], trim: true },
  phone: { type: String, required: [true, 'Phone number is required'], trim: true },
  alternatePhone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true, default: null },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, enum: ['male', 'female', 'other', null], default: null },

  // Address
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },

  // ID Proofs
  aadhaarNumber: { type: String, trim: true },
  aadhaarFrontUrl: { type: String, default: null },
  aadhaarFrontPublicId: { type: String, default: null },
  aadhaarBackUrl: { type: String, default: null },
  aadhaarBackPublicId: { type: String, default: null },

  dlNumber: { type: String, trim: true, default: null },
  dlFrontUrl: { type: String, default: null },
  dlFrontPublicId: { type: String, default: null },
  dlBackUrl: { type: String, default: null },
  dlBackPublicId: { type: String, default: null },
  dlExpiryDate: { type: Date, default: null },

  passportNumber: { type: String, default: null },
  passportUrl: { type: String, default: null },
  passportPublicId: { type: String, default: null },
  passportBackUrl: { type: String, default: null },
  passportBackPublicId: { type: String, default: null },

  voterIdNumber: { type: String, default: null },
  voterIdUrl: { type: String, default: null },
  voterIdPublicId: { type: String, default: null },
  voterIdBackUrl: { type: String, default: null },
  voterIdBackPublicId: { type: String, default: null },

  // Customer status
  isBlacklisted: { type: Boolean, default: false },
  blacklistReason: { type: String, default: null },
  blacklistedAt: { type: Date, default: null },
  blacklistedBy: { type: mongoose.Schema.Types.ObjectId, default: null },

  // Tags & notes
  tags: [{ type: String }],
  internalNotes: { type: String, default: '' },

  // Stats (denormalized for performance)
  totalRentals: { type: Number, default: 0 },
  totalAmountPaid: { type: Number, default: 0 },
  totalPendingAmount: { type: Number, default: 0 },
  lastRentalDate: { type: Date, default: null },

  // Source
  referredBy: { type: String, default: null },
  source: { type: String, enum: ['walk_in', 'whatsapp', 'phone', 'referral', 'online'], default: 'walk_in' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for multi-tenant queries
CustomerSchema.index({ agencyId: 1, phone: 1 });
CustomerSchema.index({ agencyId: 1, name: 'text', phone: 'text', email: 'text' });
CustomerSchema.index({ agencyId: 1, isBlacklisted: 1 });
CustomerSchema.index({ agencyId: 1, createdAt: -1 });

// Virtual: customer tier
CustomerSchema.virtual('tier').get(function () {
  if (this.totalRentals >= 10) return 'platinum';
  if (this.totalRentals >= 5) return 'gold';
  if (this.totalRentals >= 3) return 'silver';
  return 'new';
});

// Virtual: is DL expired
CustomerSchema.virtual('isDLExpired').get(function () {
  if (!this.dlExpiryDate) return false;
  return this.dlExpiryDate < new Date();
});

module.exports = mongoose.model('Customer', CustomerSchema);
