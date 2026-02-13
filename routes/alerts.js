/**
 * Alerts Routes (routes/alerts.js)
 * ---------------------------------
 * GET /api/alerts - Get all system alerts (newest first)
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const alerts = req.db.getAll('SELECT * FROM alerts ORDER BY created_at DESC');
  res.json(alerts);
});

module.exports = router;
