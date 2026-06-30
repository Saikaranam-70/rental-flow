const Bull = require('bull');
const cron = require('node-cron');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

let alertQueue = null;

const initQueues = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    alertQueue = new Bull('rentflow-alerts', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });

    // Process alert jobs
    alertQueue.process(5, async (job) => {
      const { type, rentalId, agencyId, customerId } = job.data;
      logger.info(`Processing alert job: ${type} for rental ${rentalId}`);

      try {
        const handler = require('./alertHandlers');
        await handler.processAlert(job.data);
      } catch (err) {
        logger.error(`Alert job failed: ${err.message}`);
        throw err;
      }
    });

    alertQueue.on('completed', (job) => logger.info(`Alert job ${job.id} completed`));
    alertQueue.on('failed', (job, err) => logger.error(`Alert job ${job.id} failed:`, err.message));

    // ── Daily cron: 9 AM IST = 3:30 AM UTC ─────────────────────────
    cron.schedule('30 3 * * *', async () => {
      logger.info('Running daily overdue check cron...');
      await runOverdueCheck();
    }, { timezone: 'Asia/Kolkata' });

    // ── Pre-due reminder: 8 AM IST ──────────────────────────────────
    cron.schedule('30 2 * * *', async () => {
      logger.info('Running due-today reminder cron...');
      await runDueReminder();
    }, { timezone: 'Asia/Kolkata' });

    // ── Daily Sales Report: 9:30 PM IST ─────────────────────────────
    cron.schedule('30 21 * * *', async () => {
      logger.info('Running daily sales report cron...');
      await runDailySalesReport();
    }, { timezone: 'Asia/Kolkata' });

    logger.info('✅ BullMQ queues and cron jobs initialized');
  } catch (err) {
    logger.error('Queue init failed (Redis may not be available):', err.message);
    logger.warn('Running without job queues — alerts disabled');
  }
};

const addToAlertQueue = async (data, options = {}) => {
  if (!alertQueue) {
    logger.warn('Alert queue not initialized, skipping:', data.type);
    return;
  }
  return alertQueue.add(data, options);
};

const runOverdueCheck = async () => {
  const Rental = require('../models/Rental');
  const Agency = require('../models/Agency');

  // Find all active rentals past due date
  const overdueRentals = await Rental.find({
    status: 'active',
    expectedReturnDate: { $lt: new Date() },
  }).populate('customerId', 'name phone email').populate('agencyId');

  for (const rental of overdueRentals) {
    // Update status to overdue
    rental.status = 'overdue';
    await rental.save();

    const agency = await Agency.findById(rental.agencyId);
    if (!agency?.settings?.whatsappEnabled) continue;

    // Check if alert already sent today
    const AlertLog = require('../models/AlertLog');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alreadySent = await AlertLog.findOne({
      rentalId: rental._id,
      type: 'overdue_whatsapp',
      sentAt: { $gte: todayStart },
    });
    if (alreadySent) continue;

    await addToAlertQueue({
      type: 'overdue_whatsapp',
      rentalId: rental._id,
      agencyId: rental.agencyId,
      customerId: rental.customerId?._id,
    });
  }

  logger.info(`Overdue check: ${overdueRentals.length} rentals processed`);
};

const runDueReminder = async () => {
  const Rental = require('../models/Rental');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueTomorrow = await Rental.find({
    status: 'active',
    expectedReturnDate: { $gte: today, $lte: tomorrow },
  });

  for (const rental of dueTomorrow) {
    await addToAlertQueue({
      type: 'due_reminder',
      rentalId: rental._id,
      agencyId: rental.agencyId,
      customerId: rental.customerId,
    });
  }
  logger.info(`Due reminder: ${dueTomorrow.length} reminders queued`);
};

const runDailySalesReport = async () => {
  const Rental = require('../models/Rental');
  const Agency = require('../models/Agency');
  const { sendMetaWhatsApp } = require('./alertHandlers');

  try {
    const agencies = await Agency.find({});
    for (const agency of agencies) {
      const ownerPhone = agency.settings?.whatsappNumber || agency.phone;
      if (!ownerPhone) continue;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // 1. Total rentals created today
      const rentalsCreatedToday = await Rental.countDocuments({
        agencyId: agency._id,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });

      // 2. Query all rentals for this agency that have payments/refunds today
      const rentalsWithTodayPayments = await Rental.find({
        agencyId: agency._id,
        'payments.paidAt': { $gte: startOfToday, $lte: endOfToday }
      });

      let totalCollected = 0;
      let totalRefunded = 0;
      let transactionsCount = 0;

      for (const rental of rentalsWithTodayPayments) {
        const todayPayments = rental.payments.filter(
          p => p.paidAt >= startOfToday && p.paidAt <= endOfToday
        );
        for (const p of todayPayments) {
          if (p.type === 'refund') {
            totalRefunded += p.amount;
          } else {
            totalCollected += p.amount;
          }
          transactionsCount++;
        }
      }

      const netRevenue = totalCollected - totalRefunded;

      // 3. Active rentals count
      const activeRentalsCount = await Rental.countDocuments({
        agencyId: agency._id,
        status: 'active'
      });

      // 4. Overdue rentals count
      const overdueRentalsCount = await Rental.countDocuments({
        agencyId: agency._id,
        status: 'overdue'
      });

      // Report template
      const reportMessage = `📊 *DAILY SALES SUMMARY - ${agency.agencyName.toUpperCase()}*\n` +
        `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
        `📈 *Performance Metrics:*\n` +
        `• New Bookings today: *${rentalsCreatedToday}*\n` +
        `• Collections today: *₹${totalCollected}*\n` +
        `• Refunds today: *₹${totalRefunded}*\n` +
        `• *Net Revenue today: ₹${netRevenue}*\n` +
        `• Total transactions: *${transactionsCount}*\n\n` +
        `🏍️ *Fleet Operations Status:*\n` +
        `• Active rentals ongoing: *${activeRentalsCount}*\n` +
        `• Overdue returns pending: *${overdueRentalsCount}*\n\n` +
        `🚀 _Sent automatically via RentalFlow CRM_`;

      try {
        await sendMetaWhatsApp(ownerPhone, reportMessage);
        logger.info(`Daily sales report sent to ${ownerPhone} for ${agency.agencyName}`);
      } catch (waErr) {
        logger.error(`Failed to send daily sales report for ${agency.agencyName}: ${waErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Error in runDailySalesReport: ${err.message}`);
  }
};

module.exports = { initQueues, addToAlertQueue, runDailySalesReport };
