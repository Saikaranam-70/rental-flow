const mongoose = require('mongoose');

const AlertLogSchema = new mongoose.Schema({
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: {
    type: String,
    enum: ['overdue_whatsapp', 'overdue_sms', 'overdue_email', 'due_reminder', 'payment_receipt', 'rental_created', 'rental_returned'],
    required: true,
  },
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], required: true },
  recipient: { type: String, required: true }, // phone or email
  message: { type: String },
  status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
  errorMessage: { type: String, default: null },
  externalId: { type: String, default: null }, // Twilio SID etc
  sentAt: { type: Date, default: null },
  retryCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

AlertLogSchema.index({ agencyId: 1, rentalId: 1 });
AlertLogSchema.index({ agencyId: 1, createdAt: -1 });
AlertLogSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model('AlertLog', AlertLogSchema);
