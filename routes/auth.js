/**
 * Auth Routes (routes/auth.js)
 * ----------------------------
 * POST /api/auth/login          - Verify credentials, return user
 * POST /api/auth/forgot         - Generate reset token, send email
 * POST /api/auth/reset-password - Validate token, update password
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Nodemailer transporter for noreply@monolithe.pro
const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.NOREPLY_EMAIL,
    pass: process.env.NOREPLY_PASS,
  },
});

const TOKEN_EXPIRY_MINUTES = 30;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = req.db.getOne(
    `SELECT id, name, email, role, is_onboarded, company_name, specialty,
            address, lat, lng, documents_status, password
     FROM users WHERE email = ?`,
    [email]
  );

  if (!user) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis.' });
  }

  const user = req.db.getOne('SELECT id, name FROM users WHERE email = ?', [email]);

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ sent: true });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Store token — delete any existing token for this user first
  req.db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
  req.db.run(
    'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, user.id, expiresAt]
  );

  const resetUrl = `${process.env.APP_URL || 'https://monolithe.pro'}/pro/portail/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"Monolithe" <${process.env.NOREPLY_EMAIL}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Réinitialisation du mot de passe</h2>
          <p>Bonjour ${user.name},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #64748b; font-size: 0.875rem;">Ce lien expire dans ${TOKEN_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #64748b; font-size: 0.875rem;">Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 0.75rem;">Monolithe — noreply@monolithe.pro</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Reset email error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail.' });
  }

  res.json({ sent: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token et nouveau mot de passe requis.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const record = req.db.getOne(
    'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?',
    [token]
  );

  if (!record) {
    return res.status(400).json({ error: 'Lien invalide ou déjà utilisé.' });
  }

  if (new Date(record.expires_at) < new Date()) {
    req.db.run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
    return res.status(400).json({ error: 'Ce lien a expiré. Veuillez en demander un nouveau.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  req.db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, record.user_id]);
  req.db.run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

  res.json({ success: true });
});

module.exports = router;
