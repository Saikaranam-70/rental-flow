const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const emailTemplates = {
  welcome: (data) => ({
    subject: `Welcome to RentFlow, ${data.ownerName}! 🎉`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">
        <div style="background:#F59E0B;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">🏍️ RentFlow</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Your rental CRM is ready</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#111318">Welcome, ${data.ownerName}!</h2>
          <p style="color:#6B7280">Your agency <strong>${data.agencyName}</strong> has been set up on RentFlow. You're on a 14-day free trial of the Pro plan.</p>
          <a href="${data.verifyUrl}" style="display:inline-block;background:#F59E0B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Verify Email & Get Started →</a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:24px">Questions? Reply to this email — we read every one.</p>
        </div>
      </div>`,
  }),

  resetPassword: (data) => ({
    subject: 'Reset your RentFlow password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2>Password Reset</h2>
        <p>Hi ${data.ownerName}, click below to reset your password. This link expires in 30 minutes.</p>
        <a href="${data.resetUrl}" style="display:inline-block;background:#EF4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#9CA3AF;font-size:13px;margin-top:24px">If you didn't request this, ignore this email.</p>
      </div>`,
  }),

  staffInvite: (data) => ({
    subject: `You're invited to ${data.agencyName} on RentFlow`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2>You're invited!</h2>
        <p>Hi ${data.name}, <strong>${data.agencyName}</strong> has invited you to join their RentFlow CRM.</p>
        <p><strong>Temporary password:</strong> <code style="background:#F3F4F6;padding:4px 8px;border-radius:4px">${data.tempPassword}</code></p>
        <a href="${data.inviteUrl}" style="display:inline-block;background:#F59E0B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Accept Invitation</a>
      </div>`,
  }),

  rentalAlert: (data) => ({
    subject: `Rental Alert — ${data.agencyName}`,
    html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px">
      <h2 style="color:#EF4444">⚠️ Overdue Rental Alert</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your rental of <strong>${data.itemName}</strong> was due on <strong>${data.dueDate}</strong> and is <strong>${data.overdueDays} day(s) overdue</strong>.</p>
      <p>Please return immediately or contact: <strong>${data.agencyPhone}</strong></p>
    </div>`,
  }),
};

exports.sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const transporter = createTransporter();
    const templateContent = template ? emailTemplates[template]?.(data) : null;

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'RentFlow'}" <${process.env.FROM_EMAIL}>`,
      to,
      subject: templateContent?.subject || subject,
      html: templateContent?.html || html,
    });

    logger.info(`Email sent to ${to}`);
  } catch (err) {
    logger.error(`Email failed to ${to}:`, err.message);
    throw err;
  }
};
