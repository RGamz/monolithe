/**
 * Client Forms Routes (routes/client-forms.js)
 * ----------------------------------------------
 * Replaces Netlify Forms — saves submissions to SQLite.
 * 
 * POST /api/forms/contact     - Contact form (client or pro)
 * POST /api/forms/devis       - Devis questionnaire submission
 * GET  /api/forms/submissions  - Admin: list all submissions
 */

const express = require('express');
const router = express.Router();

function generateId() {
  return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// POST /api/forms/contact
router.post('/contact', (req, res) => {
  const { name, email, phone, subject, company, requestType, message, source } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nom et email requis.' });
  }

  const id = generateId();
  req.db.run(
    `INSERT INTO contact_submissions (id, source, name, email, phone, subject, company, request_type, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, source || 'client', name, email, phone || null, subject || null, company || null, requestType || null, message || null]
  );
  req.db.save();

  res.json({ success: true, id });
});

// POST /api/forms/devis
router.post('/devis', (req, res) => {
  const {
    name, email, phone, projectDescription,
    projectCategory, propertyType, propertyAge,
    renovationType, area, currentCondition,
    desiredFinish, timeline, zipCode,
    estimateLow, estimateHigh, estimateAverage
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nom et email requis.' });
  }

  const id = generateId();
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
  req.db.save();

  res.json({ success: true, id });
});

// GET /api/forms/submissions — Admin only
router.get('/submissions', (req, res) => {
  const contacts = req.db.getAll(
    'SELECT * FROM contact_submissions ORDER BY created_at DESC'
  );
  const devis = req.db.getAll(
    'SELECT * FROM devis_submissions ORDER BY created_at DESC'
  );

  res.json({ contacts, devis });
});

// DELETE /api/forms/submissions/:type/:id
router.delete('/submissions/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const table = type === 'contact' ? 'contact_submissions' : 'devis_submissions';
  
  req.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  req.db.save();
  
  res.json({ success: true });
});

module.exports = router;
