/**
 * Documents Routes (routes/documents.js)
 * ----------------------------------------
 * GET    /api/documents/:artisanId       - Get all documents for an artisan
 * POST   /api/documents                  - Upload/update a document
 * DELETE /api/documents/:id              - Delete a document
 * POST   /api/documents/not-concerned    - Mark document as not concerned
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Document types with default expiry in months
const DOCUMENT_TYPES = {
  kbis: { label: 'KBIS', expiryMonths: 3, downloadable: false },
  assurance_decennale: { label: 'Assurance décennale', expiryMonths: 12, downloadable: false },
  attestation_vigilance_urssaf: { label: 'Attestation de vigilance URSSAF', expiryMonths: 6, downloadable: false },
  liste_salaries_etrangers: { label: 'Liste des salariés étrangers', expiryMonths: 12, downloadable: true },
  declaration_honneur: { label: 'Déclaration sur l\'honneur', expiryMonths: 12, downloadable: true }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.body.artisan_id}_${req.body.document_type}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF, JPG, JPEG et PNG sont autorisés.'));
    }
  }
});

// Calculate expiry date based on document type
function calculateExpiryDate(documentType) {
  const docInfo = DOCUMENT_TYPES[documentType];
  if (!docInfo) return null;

  const uploadDate = new Date();
  uploadDate.setMonth(uploadDate.getMonth() + docInfo.expiryMonths);
  return uploadDate.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Check document status based on expiry date
function checkDocumentStatus(expiryDate) {
  if (!expiryDate) return 'valid';

  const today = new Date();
  const expiry = new Date(expiryDate);

  if (expiry < today) {
    return 'expired';
  }
  return 'valid';
}

// GET /api/documents/:artisanId - Get all documents for an artisan
router.get('/:artisanId', (req, res) => {
  const { artisanId } = req.params;

  const documents = req.db.getAll(`
    SELECT id, artisan_id, document_type, file_name, upload_date,
           expiry_date, is_not_concerned, status
    FROM artisan_documents
    WHERE artisan_id = ?
    ORDER BY document_type
  `, [artisanId]);

  // Add metadata for each document type
  const allDocuments = Object.keys(DOCUMENT_TYPES).map(type => {
    const existing = documents.find(d => d.document_type === type);
    return {
      ...existing,
      document_type: type,
      label: DOCUMENT_TYPES[type].label,
      downloadable: DOCUMENT_TYPES[type].downloadable,
      expiryMonths: DOCUMENT_TYPES[type].expiryMonths,
      status: existing ? existing.status : 'missing'
    };
  });

  res.json(allDocuments);
});

// POST /api/documents - Upload/update a document
router.post('/', upload.single('file'), (req, res) => {
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

  // Calculate expiry date
  const expiryDate = custom_expiry_date || calculateExpiryDate(document_type);
  const status = checkDocumentStatus(expiryDate);

  // Check if document already exists
  const existing = req.db.getOne(
    'SELECT id, file_name FROM artisan_documents WHERE artisan_id = ? AND document_type = ?',
    [artisan_id, document_type]
  );

  if (existing) {
    // Delete old file if it exists
    if (existing.file_name) {
      const oldFilePath = path.join(__dirname, '..', 'uploads', 'documents', existing.file_name);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update existing document
    req.db.run(`
      UPDATE artisan_documents
      SET file_name = ?, upload_date = datetime('now'), expiry_date = ?,
          is_not_concerned = 0, status = ?
      WHERE id = ?
    `, [req.file.filename, expiryDate, status, existing.id]);

    req.db.save();

    const updated = req.db.getOne('SELECT * FROM artisan_documents WHERE id = ?', [existing.id]);
    return res.json(updated);
  } else {
    // Insert new document
    const id = 'doc' + Date.now();

    req.db.run(`
      INSERT INTO artisan_documents
        (id, artisan_id, document_type, file_name, expiry_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, artisan_id, document_type, req.file.filename, expiryDate, status]);

    req.db.save();

    const created = req.db.getOne('SELECT * FROM artisan_documents WHERE id = ?', [id]);
    return res.status(201).json(created);
  }
});

// POST /api/documents/not-concerned - Mark document as not concerned
router.post('/not-concerned', (req, res) => {
  const { artisan_id, document_type, is_not_concerned } = req.body;

  if (!artisan_id || !document_type) {
    return res.status(400).json({ error: 'artisan_id et document_type sont requis.' });
  }

  if (!DOCUMENT_TYPES[document_type]) {
    return res.status(400).json({ error: 'Type de document invalide.' });
  }

  // Check if document exists
  const existing = req.db.getOne(
    'SELECT id FROM artisan_documents WHERE artisan_id = ? AND document_type = ?',
    [artisan_id, document_type]
  );

  if (existing) {
    // Update existing
    req.db.run(`
      UPDATE artisan_documents
      SET is_not_concerned = ?, status = ?
      WHERE id = ?
    `, [is_not_concerned ? 1 : 0, is_not_concerned ? 'valid' : 'missing', existing.id]);
  } else {
    // Insert new record
    const id = 'doc' + Date.now();
    req.db.run(`
      INSERT INTO artisan_documents
        (id, artisan_id, document_type, is_not_concerned, status)
      VALUES (?, ?, ?, ?, ?)
    `, [id, artisan_id, document_type, is_not_concerned ? 1 : 0, is_not_concerned ? 'valid' : 'missing']);
  }

  req.db.save();

  const updated = req.db.getOne(
    'SELECT * FROM artisan_documents WHERE artisan_id = ? AND document_type = ?',
    [artisan_id, document_type]
  );

  res.json(updated);
});

// DELETE /api/documents/:id - Delete a document
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const document = req.db.getOne('SELECT file_name FROM artisan_documents WHERE id = ?', [id]);

  if (!document) {
    return res.status(404).json({ error: 'Document non trouvé.' });
  }

  // Delete file if it exists
  if (document.file_name) {
    const filePath = path.join(__dirname, '..', 'uploads', 'documents', document.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  req.db.run('DELETE FROM artisan_documents WHERE id = ?', [id]);
  req.db.save();

  res.json({ success: true, message: 'Document supprimé.' });
});

// GET /api/documents/download/:filename - Download a document
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', 'documents', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier non trouvé.' });
  }

  res.download(filePath);
});

// GET /api/documents/templates/:type - Download template documents
router.get('/templates/:type', (req, res) => {
  const { type } = req.params;

  const templates = {
    liste_salaries_etrangers: 'template-liste-salaries-etrangers.pdf',
    declaration_honneur: 'template-declaration-honneur.pdf'
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

module.exports = router;
