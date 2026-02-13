/**
 * Auth Routes (routes/auth.js)
 * ----------------------------
 * POST /api/auth/login          - Verify credentials, return user
 * POST /api/auth/forgot         - Check if email exists
 * POST /api/auth/reset-password - Update password
 */

const express = require('express');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = req.db.getOne(
    `SELECT id, name, email, role, is_onboarded, company_name, specialty, 
            address, lat, lng, documents_status
     FROM users WHERE email = ? AND password = ?`,
    [email, password]
  );

  if (!user) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  res.json(user);
});

// POST /api/auth/forgot
router.post('/forgot', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis.' });
  }

  const user = req.db.getOne('SELECT id FROM users WHERE email = ?', [email]);
  res.json({ exists: !!user });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email et nouveau mot de passe requis.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const result = req.db.run('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);
  req.db.save(); // Persist to disk

  res.json({ success: result.changes > 0 });
});

module.exports = router;
