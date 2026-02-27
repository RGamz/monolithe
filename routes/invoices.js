/**
 * Invoices Routes (routes/invoices.js)
 * -------------------------------------
 * GET    /api/invoices?artisanId=...  - Get invoices for an artisan
 * POST   /api/invoices                - Create a new invoice (multipart with file)
 * DELETE /api/invoices/:id            - Delete invoice (En attente only)
 */

const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const { documentUpload } = require('../lib/upload');
const storage = require('../lib/storage');

// GET /api/invoices
router.get('/', (req, res) => {
  const { artisanId } = req.query;

  if (!artisanId) {
    return res.status(400).json({ error: 'artisanId is required' });
  }

  const invoices = req.db.getAll(`
    SELECT i.*, p.title AS project_title
    FROM invoices i
    LEFT JOIN projects p ON i.project_id = p.id
    WHERE i.artisan_id = ?
    ORDER BY i.date DESC
  `, [artisanId]);

  res.json(invoices);
});

// POST /api/invoices
router.post('/', documentUpload.single('file'), async (req, res) => {
  const { project_id, artisan_id, amount, date } = req.body;

  if (!project_id || !artisan_id || !amount) {
    return res.status(400).json({ error: 'project_id, artisan_id, and amount are required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Fichier requis.' });
  }

  try {
    const { key, url } = await storage.upload(req.file.buffer, req.file.originalname, 'invoices');

    const id = randomUUID();
    const invoiceDate = date || new Date().toISOString().split('T')[0];

    req.db.run(`
      INSERT INTO invoices (id, project_id, artisan_id, amount, date, status, file_name, file_url, file_key, moderation_status)
      VALUES (?, ?, ?, ?, ?, 'En attente', ?, ?, ?, 'en_attente')
    `, [id, project_id, artisan_id, amount, invoiceDate, req.file.originalname, url, key]);

    const created = req.db.getOne('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(created);

  } catch (err) {
    console.error('Invoice upload error:', err);
    res.status(500).json({ error: "Erreur lors de l'upload du fichier." });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { artisanId } = req.body;

  if (!artisanId) {
    return res.status(400).json({ error: 'artisanId requis.' });
  }

  const invoice = req.db.getOne('SELECT * FROM invoices WHERE id = ?', [id]);
  if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });

  if (invoice.artisan_id !== artisanId) {
    return res.status(403).json({ error: 'Permission refusée.' });
  }

  if (invoice.status !== 'En attente') {
    return res.status(403).json({ error: 'Seules les factures "En attente" peuvent être supprimées.' });
  }

  if (invoice.file_key) {
    await storage.remove(invoice.file_key).catch(err =>
      console.error('S3 delete error:', err)
    );
  }

  req.db.run('DELETE FROM invoices WHERE id = ?', [id]);

  res.json({ success: true });
});

module.exports = router;
