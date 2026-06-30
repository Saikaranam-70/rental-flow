const Rental = require('../models/Rental');
const Agency = require('../models/Agency');
const AlertLog = require('../models/AlertLog');
const logger = require('../config/logger');

const getTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

const sendWhatsApp = async (to, message) => {
  const client = getTwilioClient();
  if (!client) { logger.warn('Twilio not configured'); return null; }

  const phone = to.startsWith('+') ? to : `+91${to}`;
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${phone}`,
    body: message,
  });
};

const sendMetaWhatsApp = async (to, message) => {
  const axios = require('axios');
  const token = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.warn('Meta WhatsApp API credentials not configured in environment');
    return null;
  }

  // Formatting phone: strip non-digits, ensure +91 / country code prefix
  let cleanTo = to.replace(/[^\d]/g, '');
  if (cleanTo.length === 10) cleanTo = `91${cleanTo}`;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    logger.error('Meta WhatsApp API failed:', err.response?.data || err.message);
    throw err;
  }
};

const { sendEmail } = require('../utils/email');

const messageTemplates = {
  overdue_whatsapp: (data) =>
    `🔴 *RentFlow Alert — ${data.agencyName}*\n\nDear ${data.customerName},\n\nYour rental of *${data.itemName}* (${data.regNo}) was due on *${data.dueDate}* and is now *${data.overdueDays} day(s) overdue*.\n\nPlease return the vehicle immediately or contact us:\n📞 ${data.agencyPhone}\n\nAmount accruing: ₹${data.dailyRate}/day\n\nThank you.`,

  due_reminder: (data) =>
    `⏰ *RentFlow Reminder — ${data.agencyName}*\n\nDear ${data.customerName},\n\nYour rental of *${data.itemName}* is due for return *tomorrow, ${data.dueDate}*.\n\nPlease return on time to avoid late fees.\n📞 ${data.agencyPhone}`,

  rental_created: (data) =>
    `✅ *Rental Confirmed — ${data.agencyName}*\n\nDear ${data.customerName},\n\nYour rental is confirmed!\n🏍️ Vehicle: ${data.itemName}\n📅 From: ${data.startDate}\n📅 Return by: ${data.returnDate}\n💰 Amount: ₹${data.totalAmount}\n🔐 Deposit: ₹${data.deposit}\n\nRental No: ${data.rentalNumber}\n\nThank you for choosing us! 🙏`,

  rental_returned: (data) =>
    `✅ *Return Confirmed — ${data.agencyName}*\n\nDear ${data.customerName},\n\nYour rental of *${data.itemName}* has been returned successfully.\n💰 Total paid: ₹${data.totalAmount}\n💵 Deposit returned: ₹${data.depositReturned}\n\nThank you! Visit us again. 🙏`,
};

exports.processAlert = async (jobData) => {
  const { type, rentalId, agencyId, customerId } = jobData;

  const rental = await Rental.findById(rentalId)
    .populate('customerId', 'name phone email')
    .populate('inventoryId', 'name registrationNumber dailyRate');

  if (!rental) { logger.warn(`Rental ${rentalId} not found for alert`); return; }

  const agency = await Agency.findById(agencyId);
  if (!agency) return;

  const customer = rental.customerId;
  const inventory = rental.inventoryId;

  const overdueDays = Math.max(0, Math.floor((new Date() - rental.expectedReturnDate) / (1000 * 60 * 60 * 24)));

  const templateData = {
    agencyName: agency.agencyName,
    agencyPhone: agency.phone,
    customerName: customer?.name || 'Customer',
    itemName: inventory?.name || 'Item',
    regNo: inventory?.registrationNumber || '',
    dueDate: rental.expectedReturnDate?.toLocaleDateString('en-IN'),
    startDate: rental.startDate?.toLocaleDateString('en-IN'),
    returnDate: rental.expectedReturnDate?.toLocaleDateString('en-IN'),
    overdueDays,
    dailyRate: inventory?.dailyRate || rental.dailyRate,
    totalAmount: rental.totalAmount,
    deposit: rental.depositAmount,
    depositReturned: rental.depositReturned || 0,
    rentalNumber: rental.rentalNumber,
  };

  const log = new AlertLog({
    agencyId,
    rentalId,
    customerId: customer?._id,
    type,
    channel: type.includes('email') ? 'email' : type.includes('sms') ? 'sms' : 'whatsapp',
    recipient: customer?.phone || customer?.email || '',
    message: messageTemplates[type]?.(templateData) || '',
    status: 'pending',
  });

  try {
    if (type.includes('whatsapp') && customer?.phone) {
      const msg = messageTemplates[type]?.(templateData);
      if (msg) {
        const result = await sendWhatsApp(customer.phone, msg);
        log.externalId = result?.sid;
      }
    } else if (type.includes('email') && customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: `[${agency.agencyName}] Rental Alert`,
        template: 'rentalAlert',
        data: templateData,
      });
    }

    log.status = 'sent';
    log.sentAt = new Date();
    rental.alertsSent.push({ type, sentAt: new Date(), channel: log.channel });
    await rental.save();
  } catch (err) {
    log.status = 'failed';
    log.errorMessage = err.message;
    logger.error(`Alert send failed: ${err.message}`);
    throw err; // trigger BullMQ retry
  } finally {
    await log.save();
  }
};

exports.sendMetaWhatsApp = sendMetaWhatsApp;
exports.sendWhatsApp = sendWhatsApp;
