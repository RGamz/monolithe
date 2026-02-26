/**
 * Moderation Routes (routes/moderation.js)
 * ------------------------------------------
 * GET  /api/moderation/pending        - All pending items grouped by artisan
 * POST /api/moderation/review         - Submit decisions + send email summary
 * PUT  /api/moderation/item           - Update editable fields (amount, date, expiry)
 */

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.NOREPLY_EMAIL,
    pass: process.env.NOREPLY_PASS,
  },
});

const DOC_LABELS = {
  kbis: 'KBIS',
  assurance_decennale: 'Assurance décennale',
  attestation_vigilance_urssaf: 'Attestation de vigilance URSSAF',
  liste_salaries_etrangers: 'Liste des salariés étrangers',
  declaration_honneur: "Déclaration sur l'honneur",
};

// GET /api/moderation/pending
router.get('/pending', (req, res) => {
  const invoices = req.db.getAll(`
    SELECT i.id, 'invoice' AS item_type, i.file_name, i.file_url, i.amount, i.date,
           i.moderation_status, i.moderation_note, i.artisan_id,
           u.name AS artisan_name, u.email AS artisan_email,
           p.title AS project_title
    FROM invoices i
    LEFT JOIN users u ON i.artisan_id = u.id
    LEFT JOIN projects p ON i.project_id = p.id
    WHERE i.moderation_status = 'en_attente'
    ORDER BY i.date DESC
  `, []);

  const documents = req.db.getAll(`
    SELECT d.id, 'document' AS item_type, d.file_name, d.file_url, d.document_type,
           d.expiry_date, d.moderation_status, d.moderation_note, d.artisan_id,
           u.name AS artisan_name, u.email AS artisan_email
    FROM artisan_documents d
    LEFT JOIN users u ON d.artisan_id = u.id
    WHERE d.moderation_status = 'en_attente' AND d.file_name IS NOT NULL
    ORDER BY d.upload_date DESC
  `, []);

  const photos = req.db.getAll(`
    SELECT pp.id, 'photo' AS item_type, pp.file_name, pp.file_url, pp.photo_type,
           pp.uploaded_at, pp.moderation_status, pp.moderation_note, pp.uploaded_by AS artisan_id,
           u.name AS artisan_name, u.email AS artisan_email,
           p.title AS project_title
    FROM project_photos pp
    LEFT JOIN users u ON pp.uploaded_by = u.id
    LEFT JOIN projects p ON pp.project_id = p.id
    WHERE pp.moderation_status = 'en_attente'
    ORDER BY pp.uploaded_at DESC
  `, []);

  // Group by artisan
  const byArtisan = {};
  const allItems = [...invoices, ...documents, ...photos];

  for (const item of allItems) {
    if (!byArtisan[item.artisan_id]) {
      byArtisan[item.artisan_id] = {
        artisan_id: item.artisan_id,
        artisan_name: item.artisan_name,
        artisan_email: item.artisan_email,
        items: [],
      };
    }
    byArtisan[item.artisan_id].items.push(item);
  }

  res.json(Object.values(byArtisan));
});

// PUT /api/moderation/item — update editable fields before decision
router.put('/item', (req, res) => {
  const { id, item_type, amount, date, expiry_date } = req.body;

  if (!id || !item_type) {
    return res.status(400).json({ error: 'id et item_type requis.' });
  }

  if (item_type === 'invoice') {
    req.db.run(
      `UPDATE invoices SET amount = COALESCE(?, amount), date = COALESCE(?, date) WHERE id = ?`,
      [amount || null, date || null, id]
    );
  } else if (item_type === 'document') {
    req.db.run(
      `UPDATE artisan_documents SET expiry_date = COALESCE(?, expiry_date) WHERE id = ?`,
      [expiry_date || null, id]
    );
  }

  res.json({ success: true });
});

// POST /api/moderation/review — submit decisions and send email
router.post('/review', async (req, res) => {
  const { decisions } = req.body;
  // decisions: [{ id, item_type, decision: 'approuvé'|'rejeté', note }]

  if (!decisions || !decisions.length) {
    return res.status(400).json({ error: 'Aucune décision fournie.' });
  }

  // Group decisions by artisan to send one email per artisan
  const byArtisan = {};

  for (const d of decisions) {
    if (!['approuvé', 'rejeté'].includes(d.decision)) continue;

    // Apply decision to DB
    if (d.item_type === 'invoice') {
      const invoiceStatus = d.decision === 'rejeté' ? 'Rejeté' : 'En attente';
      req.db.run(
        `UPDATE invoices SET moderation_status = ?, moderation_note = ?, status = ? WHERE id = ?`,
        [d.decision, d.note || null, invoiceStatus, d.id]
      );
    } else if (d.item_type === 'document') {
      const newStatus = d.decision === 'approuvé' ? 'valid' : 'missing';
      req.db.run(
        `UPDATE artisan_documents SET moderation_status = ?, moderation_note = ?, status = ? WHERE id = ?`,
        [d.decision, d.note || null, newStatus, d.id]
      );
    } else if (d.item_type === 'photo') {
      req.db.run(
        `UPDATE project_photos SET moderation_status = ?, moderation_note = ? WHERE id = ?`,
        [d.decision, d.note || null, d.id]
      );
    }

    // Fetch item details for email
    let item = null;
    if (d.item_type === 'invoice') {
      item = req.db.getOne(`
        SELECT i.*, u.name AS artisan_name, u.email AS artisan_email, p.title AS project_title
        FROM invoices i
        LEFT JOIN users u ON i.artisan_id = u.id
        LEFT JOIN projects p ON i.project_id = p.id
        WHERE i.id = ?
      `, [d.id]);
    } else if (d.item_type === 'document') {
      item = req.db.getOne(`
        SELECT d.*, u.name AS artisan_name, u.email AS artisan_email
        FROM artisan_documents d
        LEFT JOIN users u ON d.artisan_id = u.id
        WHERE d.id = ?
      `, [d.id]);
    } else if (d.item_type === 'photo') {
      item = req.db.getOne(`
        SELECT pp.*, u.name AS artisan_name, u.email AS artisan_email, p.title AS project_title
        FROM project_photos pp
        LEFT JOIN users u ON pp.uploaded_by = u.id
        LEFT JOIN projects p ON pp.project_id = p.id
        WHERE pp.id = ?
      `, [d.id]);
    }

    if (!item) continue;

    const artisanId = item.artisan_id || item.uploaded_by;
    if (!byArtisan[artisanId]) {
      byArtisan[artisanId] = {
        name: item.artisan_name,
        email: item.artisan_email,
        approved: [],
        rejected: [],
      };
    }

    const label = getItemLabel(d.item_type, item);
    if (d.decision === 'approuvé') {
      byArtisan[artisanId].approved.push(label);
    } else {
      byArtisan[artisanId].rejected.push({ label, note: d.note });
    }
  }

  // Send one summary email per artisan
  const emailErrors = [];
  for (const [, artisan] of Object.entries(byArtisan)) {
    if (!artisan.email) continue;
    try {
      await transporter.sendMail({
        from: `"Monolithe" <${process.env.NOREPLY_EMAIL}>`,
        to: artisan.email,
        subject: 'Résultat de la vérification de vos documents',
        html: buildEmailHtml(artisan),
      });
    } catch (err) {
      console.error('Moderation email error:', err);
      emailErrors.push(artisan.email);
    }
  }

  res.json({
    success: true,
    emailErrors: emailErrors.length ? emailErrors : undefined,
  });
});

function getItemLabel(type, item) {
  if (type === 'invoice') {
    return `Facture — ${item.project_title || 'Projet inconnu'} (${item.amount} €)`;
  }
  if (type === 'document') {
    return DOC_LABELS[item.document_type] || item.document_type;
  }
  if (type === 'photo') {
    const typeLabel = item.photo_type === 'before' ? 'Avant' : 'Après';
    return `Photo ${typeLabel} — ${item.project_title || 'Projet inconnu'}`;
  }
  return 'Document';
}

function buildEmailHtml(artisan) {
  const portalUrl = `${process.env.APP_URL || 'https://monolithe.pro'}/pro/portail/dashboard`;

  let approvedSection = '';
  if (artisan.approved.length) {
    const items = artisan.approved.map(l => `<li style="margin: 4px 0;">${l}</li>`).join('');
    approvedSection = `
      <div style="margin: 20px 0; padding: 16px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
        <p style="font-weight: 600; color: #166534; margin: 0 0 8px;">✅ Documents validés :</p>
        <ul style="margin: 0; padding-left: 20px; color: #166534;">${items}</ul>
      </div>`;
  }

  let rejectedSection = '';
  if (artisan.rejected.length) {
    const items = artisan.rejected.map(r => `
      <li style="margin: 8px 0;">
        <strong>${r.label}</strong>
        ${r.note ? `<br><span style="color: #991b1b; font-size: 0.875rem;">Motif : ${r.note}</span>` : ''}
      </li>`).join('');
    rejectedSection = `
      <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="font-weight: 600; color: #991b1b; margin: 0 0 8px;">❌ Documents refusés :</p>
        <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">${items}</ul>
        <p style="margin: 12px 0 0; color: #991b1b; font-size: 0.875rem;">
          Veuillez vous connecter à votre espace pour déposer de nouveaux documents.
        </p>
      </div>`;
  }

  return `
    <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #1e293b;">Vérification de vos documents</h2>
      <p>Bonjour ${artisan.name},</p>
      <p>Voici le résultat de la vérification de vos documents récemment déposés :</p>
      ${approvedSection}
      ${rejectedSection}
      <a href="${portalUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Accéder à mon espace
      </a>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 0.75rem;">Monolithe — noreply@monolithe.pro</p>
    </div>
  `;
}

module.exports = router;
