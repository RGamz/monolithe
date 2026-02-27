/**
 * Mailer (lib/mailer.js)
 * ----------------------
 * Two shared Nodemailer transporters for OVH SMTP:
 *
 *   noreply  — noreply@monolithe.pro
 *              Used by: auth (password reset), moderation (review results)
 *              ENV: NOREPLY_EMAIL, NOREPLY_PASS
 *
 *   contact  — contact@monolithe.pro
 *              Used by: client-forms (contact / devis notifications)
 *              ENV: SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT
 */

const nodemailer = require('nodemailer');

const noreplyTransporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.NOREPLY_EMAIL,
    pass: process.env.NOREPLY_PASS,
  },
});

const contactTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = { noreplyTransporter, contactTransporter };
