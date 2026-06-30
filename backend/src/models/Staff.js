const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const StaffSchema = new mongoose.Schema({
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String, trim: true },
  role: {
    type: String,
    enum: ['manager', 'staff', 'accountant', 'viewer'],
    default: 'staff',
  },
  permissions: {
    canCreateRental: { type: Boolean, default: true },
    canDeleteRental: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManagePayments: { type: Boolean, default: true },
    canBlacklistCustomer: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
  inviteToken: { type: String, select: false },
  inviteExpires: { type: Date, select: false },
  lastLoginAt: { type: Date, default: null },
  refreshToken: { type: String, select: false },
}, {
  timestamps: true,
});

StaffSchema.index({ agencyId: 1, email: 1 }, { unique: true });

StaffSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

StaffSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

StaffSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, agencyId: this.agencyId, role: this.role, isStaff: true },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = mongoose.model('Staff', StaffSchema);
