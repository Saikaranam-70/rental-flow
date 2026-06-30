const mongoose = require('mongoose');

const MaintenanceLogSchema = new mongoose.Schema({
  description: String,
  cost: Number,
  date: { type: Date, default: Date.now },
  nextServiceDate: Date,
  servicedBy: String,
}, { _id: false });

const InventorySchema = new mongoose.Schema({
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },

  // Vehicle / item details
  name: { type: String, required: [true, 'Item name is required'], trim: true },
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  year: { type: Number },
  color: { type: String, trim: true },
  category: {
    type: String,
    enum: ['bike', 'scooter', 'car', 'cycle', 'auto', 'truck', 'equipment', 'other'],
    required: true,
  },
  subcategory: { type: String, trim: true }, // e.g., "sports bike", "luxury car"
  fuelType: { type: String, enum: ['petrol', 'diesel', 'electric', 'cng', 'na'], default: 'na' },
  engineCC: { type: Number, default: null },
  seatingCapacity: { type: Number, default: null },

  // Registration
  registrationNumber: { type: String, trim: true },
  chassisNumber: { type: String, trim: true },
  engineNumber: { type: String, trim: true },
  insuranceNumber: { type: String, trim: true },
  insuranceExpiryDate: { type: Date, default: null },
  pucExpiryDate: { type: Date, default: null },
  rcExpiryDate: { type: Date, default: null },

  // Pricing
  dailyRate: { type: Number, required: [true, 'Daily rate is required'], min: 0 },
  weeklyRate: { type: Number, default: null }, // optional discounted weekly rate
  monthlyRate: { type: Number, default: null },
  depositAmount: { type: Number, required: [true, 'Deposit amount is required'], min: 0 },
  extraHourRate: { type: Number, default: 0 },
  lateFeePerDay: { type: Number, default: 0 }, // overdue penalty per day

  // Photos
  photos: [{
    url: { type: String },
    publicId: { type: String },
    isPrimary: { type: Boolean, default: false },
  }],

  // Status
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance', 'retired', 'reserved'],
    default: 'available',
  },

  // Maintenance
  currentOdometer: { type: Number, default: 0 },
  nextServiceOdometer: { type: Number, default: null },
  maintenanceLogs: [MaintenanceLogSchema],
  lastServiceDate: { type: Date, default: null },

  // Stats
  totalRentals: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalRentedDays: { type: Number, default: 0 },

  // Misc
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  tags: [{ type: String }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

InventorySchema.index({ agencyId: 1, status: 1 });
InventorySchema.index({ agencyId: 1, category: 1 });
InventorySchema.index({ agencyId: 1, registrationNumber: 1 });

// Virtual: primary photo
InventorySchema.virtual('primaryPhoto').get(function () {
  if (!this.photos) return null;
  const primary = this.photos.find(p => p.isPrimary);
  return primary ? primary.url : (this.photos[0]?.url || null);
});

// Virtual: is insurance expired
InventorySchema.virtual('isInsuranceExpired').get(function () {
  if (!this.insuranceExpiryDate) return false;
  return this.insuranceExpiryDate < new Date();
});

// Virtual: is PUC expired
InventorySchema.virtual('isPUCExpired').get(function () {
  if (!this.pucExpiryDate) return false;
  return this.pucExpiryDate < new Date();
});

module.exports = mongoose.model('Inventory', InventorySchema);
