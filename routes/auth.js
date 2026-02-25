/**
 * Auth Routes (routes/auth.js)
 * ----------------------------
 * POST /api/auth/login          - Verify credentials, return user
 * POST /api/auth/forgot         - Check if email exists
 * POST /api/auth/reset-password - Update password (bcrypt hashed)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  // Fetch user by email only — never match password in SQL
  const user = req.db.getOne(
    `SELECT id, name, email, role, is_onboarded, company_name, specialty,
            address, lat, lng, documents_status, password AS hashed_password
     FROM users WHERE email = ?`,
    [email]
  );

  if (!user) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  const match = await bcrypt.compare(password, user.hashed_password);
  if (!match) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  // Return user without the hashed password
  const { hashed_password, ...safeUser } = user;
  res.json(safeUser);
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
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email et nouveau mot de passe requis.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const result = req.db.run('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
  req.db.save();

  res.json({ success: result.changes > 0 });
});

module.exports = router;
