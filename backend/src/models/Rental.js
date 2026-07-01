const mongoose = require('mongoose');

const PaymentEntrySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'upi', 'card', 'netbanking', 'cheque'], required: true },
  type: { type: String, enum: ['deposit', 'rental', 'penalty', 'extension', 'refund', 'partial'], required: true },
  reference: { type: String, default: null }, // UPI ref / cheque no
  note: { type: String, default: '' },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  paidAt: { type: Date, default: Date.now },
}, { _id: true, timestamps: false });

const ExtensionSchema = new mongoose.Schema({
  previousReturnDate: Date,
  newReturnDate: Date,
  additionalDays: Number,
  additionalAmount: Number,
  reason: String,
  extendedAt: { type: Date, default: Date.now },
  extendedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { _id: false });

const RentalSchema = new mongoose.Schema({
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },

  // Rental number (auto-generated, human readable)
  rentalNumber: { type: String },

  // Dates
  startDate: { type: Date, required: true },
  expectedReturnDate: { type: Date, required: true },
  actualReturnDate: { type: Date, default: null },

  // Duration
  totalDays: { type: Number, required: true },
  extraDays: { type: Number, default: 0 }, // overdue days when returned

  // Pricing snapshot (rates at time of rental)
  dailyRate: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  depositReturned: { type: Number, default: null },
  depositReturnDate: { type: Date, default: null },

  // Amounts
  baseAmount: { type: Number, required: true }, // dailyRate × totalDays
  extensionAmount: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }, // final billable
  amountPaid: { type: Number, default: 0 },
  amountPending: { type: Number, default: 0 },

  // Status
  status: {
    type: String,
    enum: ['active', 'overdue', 'returned', 'cancelled', 'reserved'],
    default: 'active',
  },

  // Odometer (for vehicles)
  startOdometer: { type: Number, default: null },
  endOdometer: { type: Number, default: null },

  // Documents
  agreementUrl: { type: String, default: null },
  agreementPublicId: { type: String, default: null },

  // Payments
  payments: [PaymentEntrySchema],

  // Extensions history
  extensions: [ExtensionSchema],

  // Alert tracking
  alertsSent: [{
    type: { type: String },
    sentAt: Date,
    channel: String,
  }],

  // Notes
  notes: { type: String, default: '' },
  returnNotes: { type: String, default: '' },
  internalNotes: { type: String, default: '' },

  // Staff who created/closed
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  closedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  closedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
RentalSchema.index({ agencyId: 1, status: 1 });
RentalSchema.index({ agencyId: 1, customerId: 1 });
RentalSchema.index({ agencyId: 1, inventoryId: 1 });
RentalSchema.index({ agencyId: 1, expectedReturnDate: 1 });
RentalSchema.index({ agencyId: 1, createdAt: -1 });
RentalSchema.index({ agencyId: 1, rentalNumber: 1 }, { unique: true });

// Virtual: overdue days
RentalSchema.virtual('overdueDays').get(function () {
  if (this.status !== 'overdue') return 0;
  const ref = this.actualReturnDate || new Date();
  return Math.max(0, Math.floor((ref - this.expectedReturnDate) / (1000 * 60 * 60 * 24)));
});

// Virtual: total collected
RentalSchema.virtual('totalCollected').get(function () {
  return this.payments
    .filter(p => p.type !== 'refund')
    .reduce((sum, p) => sum + p.amount, 0);
});

// Auto-generate rental number before save
RentalSchema.pre('save', async function (next) {
  if (this.isNew && !this.rentalNumber) {
    const count = await mongoose.model('Rental').countDocuments({ agencyId: this.agencyId });
    const year = new Date().getFullYear().toString().slice(-2);
    this.rentalNumber = `RF${year}${String(count + 1).padStart(4, '0')}`;
  }

  // Auto-update amount pending
  const paid = this.payments
    .filter(p => p.type !== 'refund')
    .reduce((sum, p) => sum + p.amount, 0);
  this.amountPaid = paid;
  this.amountPending = Math.max(0, this.totalAmount - paid + this.depositAmount - (this.depositReturned || 0));

  next();
});

module.exports = mongoose.model('Rental', RentalSchema);
