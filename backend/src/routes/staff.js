const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const crypto = require('crypto');
const { protect, tenantGuard, ownerOnly, requirePermission } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../utils/email');

router.use(protect, tenantGuard);

// Get all staff
router.get('/', requirePermission('canManageStaff'), catchAsync(async (req, res) => {
  const staff = await Staff.find({ agencyId: req.agencyId });
  res.json({ success: true, data: staff });
}));

// Invite staff member
router.post('/invite', requirePermission('canManageStaff'), catchAsync(async (req, res, next) => {
  const { name, email, role, permissions } = req.body;
  if (!name || !email) return next(new AppError('Name and email required', 400));

  const existing = await Staff.findOne({ agencyId: req.agencyId, email: email.toLowerCase() });
  if (existing) return next(new AppError('Staff member with this email already exists', 409));

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const tempPassword = crypto.randomBytes(8).toString('hex');

  const staff = await Staff.create({
    agencyId: req.agencyId,
    name, email, role,
    password: tempPassword,
    permissions: permissions || {},
    inviteToken: crypto.createHash('sha256').update(inviteToken).digest('hex'),
    inviteExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const inviteUrl = `${process.env.FRONTEND_URL}/staff/accept-invite?token=${inviteToken}`;
  try {
    await sendEmail({
      to: email,
      subject: `You've been invited to ${req.agency.agencyName} on RentFlow`,
      template: 'staffInvite',
      data: { name, agencyName: req.agency.agencyName, inviteUrl, tempPassword },
    });
  } catch (err) { /* log but don't fail */ }

  res.status(201).json({ success: true, data: staff, message: 'Staff invitation sent' });
}));

// Update staff permissions
router.put('/:id', requirePermission('canManageStaff'), catchAsync(async (req, res, next) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, agencyId: req.agencyId },
    { $set: req.body },
    { new: true }
  );
  if (!staff) return next(new AppError('Staff not found', 404));
  res.json({ success: true, data: staff });
}));

// Remove staff
router.delete('/:id', requirePermission('canManageStaff'), catchAsync(async (req, res, next) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, agencyId: req.agencyId },
    { isActive: false },
    { new: true }
  );
  if (!staff) return next(new AppError('Staff not found', 404));
  res.json({ success: true, message: 'Staff deactivated' });
}));

module.exports = router;
