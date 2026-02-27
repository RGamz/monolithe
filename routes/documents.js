/**
 * Documents Routes (routes/documents.js)
 * ----------------------------------------
 * GET    /api/documents/download/:filename  - Redirect to S3 URL for a document
 * GET    /api/documents/templates/:type     - Download a template PDF
 * GET    /api/documents/:artisanId          - Get all documents for an artisan
 * POST   /api/documents                     - Upload/update a document
 * POST   /api/documents/not-concerned       - Mark document as not concerned
 * DELETE /api/documents/:id                 - Delete a document
 *
 * NOTE: The specific GET routes (/download/*, /templates/*) MUST be declared before
 * the dynamic /:artisanId route, otherwise Express matches them as artisan IDs.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { documentUpload } = require('../lib/upload');
const s3 = require('../lib/storage');

// Document types with default expiry in months
const DOCUMENT_TYPES = {
  kbis:                        { label: 'KBIS',                               expiryMonths: 3,  downloadable: false },
  assurance_decennale:         { label: 'Assurance décennale',                expiryMonths: 12, downloadable: false },
  attestation_vigilance_urssaf:{ label: 'Attestation de vigilance URSSAF',    expiryMonths: 6,  downloadable: false },
  liste_salaries_etrangers:    { label: 'Liste des salariés étrangers',        expiryMonths: 12, downloadable: true  },
  declaration_honneur:         { label: "Déclaration sur l'honneur",           expiryMonths: 12, downloadable: true  },
};

function calculateExpiryDate(documentType) {
  const docInfo = DOCUMENT_TYPES[documentType];
  if (!docInfo) return null;
  const date = new Date();
  date.setMonth(date.getMonth() + docInfo.expiryMonths);
  return date.toISOString().split('T')[0];
}

function checkDocumentStatus(expiryDate) {
  if (!expiryDate) return 'valid';
  return new Date(expiryDate) < new Date() ? 'expired' : 'valid';
}

// ---------------------------------------------------------------
// GET /api/documents/download/:filename
// MUST be before /:artisanId to avoid Express matching "download" as an artisan ID
// ---------------------------------------------------------------
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;

  const doc = req.db.getOne('SELECT file_url FROM artisan_documents WHERE file_name = ?', [filename]);

  if (!doc || !doc.file_url) {
    return res.status(404).json({ error: 'Fichier non trouvé.' });
  }

  res.redirect(doc.file_url);
});

// ---------------------------------------------------------------
// GET /api/documents/templates/:type
// MUST be before /:artisanId for the same reason
// ---------------------------------------------------------------
router.get('/templates/:type', (req, res) => {
  const { type } = req.params;

  const templates = {
    liste_salaries_etrangers: 'template-liste-salaries-etrangers.pdf',
    declaration_honneur:      'template-declaration-honneur.pdf',
  };

  if (!templates[type]) {
    return res.status(404).json({ error: 'Template non trouvé.' });
  }

  const templatePath = path.join(__dirname, '..', 'public', 'templates', templates[type]);

  if (!fs.existsSync(templatePath)) {
    return res.status(404).json({ error: 'Fichier template non trouvé.' });
  }

  res.download(templatePath);
});

// ---------------------------------------------------------------
// GET /api/documents/:artisanId
// ---------------------------------------------------------------
router.get('/:artisanId', (req, res) => {
  const { artisanId } = req.params;

  const documents = req.db.getAll(`
    SELECT id, artisan_id, document_type, file_name, file_url, upload_date,
           expiry_date, is_not_concerned, status, moderation_status, moderation_note
    FROM artisan_documents
    WHERE artisan_id = ?
    ORDER BY document_type
  `, [artisanId]);

  // Merge with full type metadata so the client always sees all expected types
  const allDocuments = Object.keys(DOCUMENT_TYPES).map(type => {
    const existing = documents.find(d => d.document_type === type);
    return {
      ...existing,
      document_type: type,
      label: DOCUMENT_TYPES[type].label,
      downloadable: DOCUMENT_TYPES[type].downloadable,
      expiryMonths: DOCUMENT_TYPES[type].expiryMonths,
      status: existing ? existing.status : 'missing',
    };
  });

  res.json(allDocuments);
});

// ---------------------------------------------------------------
// POST /api/documents — Upload/update a document
// ---------------------------------------------------------------
router.post('/', documentUpload.single('file'), async (req, res) => {
  const { artisan_id, document_type, custom_expiry_date } = req.body;

  if (!artisan_id || !document_type) {
    return res.status(400).json({ error: 'artisan_id et document_type sont requis.' });
  }

  if (!DOCUMENT_TYPES[document_type]) {
    return res.status(400).json({ error: 'Type de document invalide.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
  }

  try {
    const { key, url } = await s3.upload(req.file.buffer, req.file.originalname, 'documents');

    const expiryDate = custom_expiry_date || calculateExpiryDate(document_type);
    const status = checkDocumentStatus(expiryDate);

    const existing = req.db.getOne(
      'SELECT id, file_key FROM artisan_documents WHERE artisan_id = ? AND document_type = ?',
      [artisan_id, document_type]
    );

    if (existing) {
      if (existing.file_key) {
        await s3.remove(existing.file_key).catch(err =>
          console.error('S3 delete old doc error:', err)
        );
      }

      req.db.run(`
        UPDATE artisan_documents
        SET file_name = ?, file_url = ?, file_key = ?, upload_date = datetime('now'),
            expiry_date = ?, is_not_concerned = 0, status = ?,
            moderation_status = 'en_attente', moderation_note = NULL
        WHERE id = ?
      `, [req.file.originalname, url, key, expiryDate, status, existing.id]);

      const updated = req.db.getOne('SELECT * FROM artisan_documents WHERE id = ?', [existing.id]);
      return res.json(updated);

    } else {
      const id = randomUUID();

      req.db.run(`
        INSERT INTO artisan_documents
          (id, artisan_id, document_type, file_name, file_url, file_key, expiry_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, artisan_id, document_type, req.file.originalname, url, key, expiryDate, status]);

      const created = req.db.getOne('SELECT * FROM artisan_documents WHERE id = ?', [id]);
      return res.status(201).json(created);
    }

  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: "Erreur lors de l'upload du fichier." });
  }
});

// ---------------------------------------------------------------
// POST /api/documents/not-concerned — Mark document as not concerned
// ---------------------------------------------------------------
router.post('/not-concerned', (req, res) => {
  const { artisan_id, document_type, is_not_concerned } = req.body;

  if (!artisan_id || !document_type) {
    return res.status(400).json({ error: 'artisan_id et document_type sont requis.' });
  }

  if (!DOCUMENT_TYPES[document_type]) {
    return res.status(400).json({ error: 'Type de document invalide.' });
  }

  const existing = req.db.getOne(
    'SELECT id FROM artisan_documents WHERE artisan_id = ? AND document_type = ?',
    [artisan_id, document_type]
  );

  if (existing) {
    req.db.run(`
      UPDATE artisan_documents
      SET is_not_concerned = ?, status = ?
      WHERE id = ?
    `, [is_not_concerned ? 1 : 0, is_not_concerned ? 'valid' : 'missing', existing.id]);
  } else {
    const id = randomUUID();
    req.db.run(`
      INSERT INTO artisan_documents
        (id, artisan_id, document_type, is_not_concerned, status)
      VALUES (?, ?, ?, ?, ?)
    `, [id, artisan_id, document_type, is_not_concerned ? 1 : 0, is_not_concerned ? 'valid' : 'missing']);
  }

  const updated = req.db.getOne(
    'SELECT * FROM artisan_documents WHERE artisan_id = ? AND document_type = ?',
    [artisan_id, document_type]
  );

  res.json(updated);
});

// ---------------------------------------------------------------
// DELETE /api/documents/:id
// ---------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const document = req.db.getOne('SELECT file_key FROM artisan_documents WHERE id = ?', [id]);

  if (!document) {
    return res.status(404).json({ error: 'Document non trouvé.' });
  }

  if (document.file_key) {
    await s3.remove(document.file_key).catch(err =>
      console.error('S3 delete error:', err)
    );
  }

  req.db.run('DELETE FROM artisan_documents WHERE id = ?', [id]);

  res.json({ success: true, message: 'Document supprimé.' });
});

module.exports = router;
