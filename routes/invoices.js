/**
 * Invoices Routes (routes/invoices.js)
 * -------------------------------------
 * GET  /api/invoices?artisanId=...  - Get invoices for an artisan
 * POST /api/invoices                 - Create a new invoice
 */

const express = require('express');
const router = express.Router();

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
router.post('/', (req, res) => {
  const { project_id, artisan_id, amount, date, file_name } = req.body;

  if (!project_id || !artisan_id || !amount) {
    return res.status(400).json({ error: 'project_id, artisan_id, and amount are required' });
  }

  const id = 'inv' + Date.now();
  const invoiceDate = date || new Date().toISOString().split('T')[0];

  req.db.run(`
    INSERT INTO invoices (id, project_id, artisan_id, amount, date, status, file_name)
    VALUES (?, ?, ?, ?, ?, 'En attente', ?)
  `, [id, project_id, artisan_id, amount, invoiceDate, file_name || 'facture.pdf']);

  req.db.save();

  const created = req.db.getOne('SELECT * FROM invoices WHERE id = ?', [id]);
  res.json(created);
});

module.exports = router;
