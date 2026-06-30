const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Agency = require('../models/Agency');
const logger = require('../config/logger');

// Razorpay webhook - verify signature and update plan
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSig) {
    logger.warn('Invalid Razorpay webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body);
  logger.info(`Razorpay webhook: ${event.event}`);

  if (event.event === 'subscription.activated') {
    const { notes, plan_id } = event.payload.subscription.entity;
    const agencyId = notes?.agencyId;
    if (agencyId) {
      const planMap = { /* map your Razorpay plan IDs to plan names */};
      await Agency.findByIdAndUpdate(agencyId, {
        plan: 'pro',
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  res.json({ received: true });
});

module.exports = router;
