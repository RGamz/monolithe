/**
 * Client Forms Routes (routes/client-forms.js)
 * ----------------------------------------------
 * Replaces Netlify Forms — saves submissions to SQLite.
 * Sends email notifications via OVH SMTP (Nodemailer).
 *
 * POST /api/forms/contact               - Contact form (client or pro)
 * POST /api/forms/devis                 - Devis questionnaire submission
 * GET  /api/forms/submissions           - Admin: list all submissions
 * GET  /api/forms/unread-count          - Count unread submissions (badge)
 * POST /api/forms/submissions/:type/:id/read  - Mark a submission as read
 * DELETE /api/forms/submissions/:type/:id     - Delete a submission
 */

const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const { contactTransporter } = require('../lib/mailer');

// Allowlist for submission table routing — prevents any dynamic table injection
const SUBMISSION_TABLES = {
  contact: 'contact_submissions',
  devis:   'devis_submissions',
};

// ---------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------

async function sendContactEmails({ name, email, phone, subject, company, requestType, message, source }) {
  const sourceLabel = source === 'pro' ? 'Espace Pro' : 'Site client';

  await contactTransporter.sendMail({
    from: `"Monolithe" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `[Nouveau contact] ${subject || 'Sans objet'} — ${sourceLabel}`,
    html: `
      <h2>Nouveau message de contact</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px;font-weight:600;">Source</td><td style="padding:6px 12px;">${sourceLabel}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Nom</td><td style="padding:6px 12px;">${name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Email</td><td style="padding:6px 12px;">${email}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Téléphone</td><td style="padding:6px 12px;">${phone || 'Non renseigné'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Société</td><td style="padding:6px 12px;">${company || 'Non renseignée'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Sujet</td><td style="padding:6px 12px;">${subject || 'Non renseigné'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Type de demande</td><td style="padding:6px 12px;">${requestType || 'Non renseigné'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Message</td><td style="padding:6px 12px;">${message || 'Aucun message'}</td></tr>
      </table>
    `,
  });

  await contactTransporter.sendMail({
    from: `"Monolithe" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Nous avons bien reçu votre message — Monolithe',
    html: `
      <p>Bonjour ${name},</p>
      <p>Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
      <p>Cordialement,<br>L'équipe Monolithe</p>
    `,
  });
}

async function sendDevisEmails({ name, email, phone, projectCategory, projectDescription, zipCode, estimateAverage }) {
  await contactTransporter.sendMail({
    from: `"Monolithe" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `[Nouvelle demande de devis] ${projectCategory || 'Projet'} — ${name}`,
    html: `
      <h2>Nouvelle demande de devis</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px;font-weight:600;">Nom</td><td style="padding:6px 12px;">${name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Email</td><td style="padding:6px 12px;">${email}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Téléphone</td><td style="padding:6px 12px;">${phone || 'Non renseigné'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Catégorie</td><td style="padding:6px 12px;">${projectCategory || 'Non renseignée'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Description</td><td style="padding:6px 12px;">${projectDescription || 'Non renseignée'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Code postal</td><td style="padding:6px 12px;">${zipCode || 'Non renseigné'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;">Estimation moyenne</td><td style="padding:6px 12px;">${estimateAverage ? estimateAverage + ' €' : 'N/A'}</td></tr>
      </table>
    `,
  });

  await contactTransporter.sendMail({
    from: `"Monolithe" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Votre demande de devis a été reçue — Monolithe',
    html: `
      <p>Bonjour ${name},</p>
      <p>Nous avons bien reçu votre demande de devis et nous vous contacterons rapidement pour discuter de votre projet.</p>
      <p>Cordialement,<br>L'équipe Monolithe</p>
    `,
  });
}

// ---------------------------------------------------------------
// Routes
// ---------------------------------------------------------------

// POST /api/forms/contact
router.post('/contact', async (req, res) => {
  const { name, email, phone, subject, company, requestType, message, source } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nom et email requis.' });
  }

  const id = randomUUID();
  req.db.run(
    `INSERT INTO contact_submissions (id, source, name, email, phone, subject, company, request_type, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, source || 'client', name, email, phone || null, subject || null, company || null, requestType || null, message || null]
  );

  // Send emails async — don't block the response
  sendContactEmails({ name, email, phone, subject, company, requestType, message, source })
    .catch(err => console.error('Contact email error:', err));

  res.json({ success: true, id });
});

// POST /api/forms/devis
router.post('/devis', async (req, res) => {
  const {
    name, email, phone, projectDescription,
    projectCategory, propertyType, propertyAge,
    renovationType, area, currentCondition,
    desiredFinish, timeline, zipCode,
    estimateLow, estimateHigh, estimateAverage,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nom et email requis.' });
  }

  const id = randomUUID();
  req.db.run(
    `INSERT INTO devis_submissions
     (id, name, email, phone, project_description, project_category, property_type, property_age,
      renovation_type, area, current_condition, desired_finish, timeline, zip_code,
      estimate_low, estimate_high, estimate_average)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email, phone || null, projectDescription || null,
     projectCategory || null, propertyType || null, propertyAge || null,
     renovationType || null, area || null, currentCondition || null,
     desiredFinish || null, timeline || null, zipCode || null,
     estimateLow || null, estimateHigh || null, estimateAverage || null]
  );

  // Send emails async — don't block the response
  sendDevisEmails({ name, email, phone, projectDescription, projectCategory, zipCode, estimateAverage })
    .catch(err => console.error('Devis email error:', err));

  res.json({ success: true, id });
});

// GET /api/forms/unread-count — count unread submissions for badge
router.get('/unread-count', (req, res) => {
  const contacts = req.db.getOne('SELECT COUNT(*) as n FROM contact_submissions WHERE read_at IS NULL');
  const devis    = req.db.getOne('SELECT COUNT(*) as n FROM devis_submissions WHERE read_at IS NULL');
  res.json({ count: (contacts.n || 0) + (devis.n || 0) });
});

// POST /api/forms/submissions/:type/:id/read — mark a submission as read
router.post('/submissions/:type/:id/read', (req, res) => {
  const { type, id } = req.params;
  const table = SUBMISSION_TABLES[type];
  if (!table) return res.status(400).json({ error: 'Type invalide.' });

  req.db.run(`UPDATE ${table} SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL`, [id]);
  res.json({ success: true });
});

// GET /api/forms/submissions — Admin only
router.get('/submissions', (req, res) => {
  const contacts = req.db.getAll('SELECT * FROM contact_submissions ORDER BY created_at DESC');
  const devis    = req.db.getAll('SELECT * FROM devis_submissions ORDER BY created_at DESC');
  res.json({ contacts, devis });
});

// DELETE /api/forms/submissions/:type/:id
router.delete('/submissions/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const table = SUBMISSION_TABLES[type];
  if (!table) return res.status(400).json({ error: 'Type invalide.' });

  req.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  res.json({ success: true });
});

module.exports = router;
