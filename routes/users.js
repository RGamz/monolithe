/**
 * Users Routes (routes/users.js)
 * --------------------------------
 * GET    /api/users              - Get all users (Admin)
 * GET    /api/users/artisans     - Get artisans only (Admin directory)
 * GET    /api/users/clients      - Get clients only (Admin)
 * POST   /api/users              - Create a new user (Admin)
 * PUT    /api/users/:id          - Update a user (Admin)
 * DELETE /api/users/:id          - Delete a user (Admin)
 * POST   /api/users/profile      - Update own profile (onboarding)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

// Shared column list — used in every SELECT to avoid repetition
const USER_FIELDS = `id, name, email, role, is_onboarded, company_name, specialty, phone,
                     address, lat, lng, documents_status`;

// GET /api/users — All users (for admin panel)
router.get('/', (req, res) => {
  const users = req.db.getAll(`
    SELECT ${USER_FIELDS}
    FROM users
    ORDER BY role, name
  `);

  // For artisans, calculate document compliance status
  const usersWithDocStatus = users.map(user => {
    if (user.role === 'ARTISAN') {
      const documents = req.db.getAll(`
        SELECT status, is_not_concerned
        FROM artisan_documents
        WHERE artisan_id = ?
      `, [user.id]);

      const requiredDocsCount = 5;
      let overallStatus = 'compliant';

      if (documents.length < requiredDocsCount) {
        overallStatus = 'missing';
      } else {
        const hasExpired = documents.some(d => d.status === 'expired' && !d.is_not_concerned);
        if (hasExpired) overallStatus = 'expired';
      }

      return { ...user, documents_status: overallStatus };
    }
    return user;
  });

  res.json(usersWithDocStatus);
});

// GET /api/users/artisans
router.get('/artisans', (req, res) => {
  const artisans = req.db.getAll(`
    SELECT ${USER_FIELDS}
    FROM users WHERE role = 'ARTISAN' ORDER BY name
  `);
  res.json(artisans);
});

// GET /api/users/clients
router.get('/clients', (req, res) => {
  const clients = req.db.getAll(`
    SELECT ${USER_FIELDS}
    FROM users WHERE role = 'CLIENT' ORDER BY name
  `);
  res.json(clients);
});

// POST /api/users — Create new user (Admin)
router.post('/', async (req, res) => {
  const { name, email, password, role, company_name, specialty, address, lat, lng, documents_status } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nom, email, mot de passe et rôle sont requis.' });
  }

  if (!['ADMIN', 'ARTISAN', 'CLIENT'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide. Choix: ADMIN, ARTISAN, CLIENT.' });
  }

  const existing = req.db.getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Un utilisateur avec cet e-mail existe déjà.' });
  }

  const id = randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  req.db.run(`
    INSERT INTO users (id, name, email, password, role, is_onboarded, company_name, specialty, address, lat, lng, documents_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, name, email, hashedPassword, role,
    role === 'ADMIN' ? 1 : 0,
    company_name || null,
    specialty || null,
    address || null,
    lat || null,
    lng || null,
    documents_status || null,
  ]);

  const created = req.db.getOne(`
    SELECT ${USER_FIELDS} FROM users WHERE id = ?
  `, [id]);

  res.status(201).json(created);
});

// PUT /api/users/:id — Update user (Admin)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, company_name, specialty, address, lat, lng, documents_status, is_onboarded } = req.body;

  const existing = req.db.getOne('SELECT id, role FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Utilisateur non trouvé.' });
  }

  if (email) {
    const emailTaken = req.db.getOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (emailTaken) {
      return res.status(409).json({ error: 'Un autre utilisateur utilise déjà cet e-mail.' });
    }
  }

  const resolvedRole = role || existing.role;
  const isArtisan = resolvedRole === 'ARTISAN';

  // Hash the new password only if one was provided
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  req.db.run(`
    UPDATE users SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      password = COALESCE(?, password),
      role = COALESCE(?, role),
      company_name = ?,
      specialty = ?,
      address = ?,
      lat = ?,
      lng = ?,
      documents_status = ?,
      is_onboarded = COALESCE(?, is_onboarded)
    WHERE id = ?
  `, [
    name || null,
    email || null,
    hashedPassword,
    role || null,
    company_name || null,
    isArtisan ? (specialty || null) : null,
    address || null,
    lat || null,
    lng || null,
    isArtisan ? (documents_status || null) : null,
    is_onboarded !== undefined ? is_onboarded : null,
    id,
  ]);

  const updated = req.db.getOne(`
    SELECT ${USER_FIELDS} FROM users WHERE id = ?
  `, [id]);

  res.json(updated);
});

// DELETE /api/users/:id — Delete user (Admin)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = req.db.getOne('SELECT id, role FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Utilisateur non trouvé.' });
  }

  req.db.run('DELETE FROM project_artisans WHERE artisan_id = ?', [id]);
  req.db.run('DELETE FROM invoices WHERE artisan_id = ?', [id]);
  req.db.run('DELETE FROM users WHERE id = ?', [id]);

  res.json({ success: true, message: `Utilisateur ${id} supprimé.` });
});

// POST /api/users/profile — Update own profile (onboarding)
router.post('/profile', (req, res) => {
  const { userId, company_name, address, specialty } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  req.db.run(`
    UPDATE users
    SET company_name = COALESCE(?, company_name),
        address = COALESCE(?, address),
        specialty = COALESCE(?, specialty),
        is_onboarded = 1
    WHERE id = ?
  `, [company_name || null, address || null, specialty || null, userId]);

  const updated = req.db.getOne(`
    SELECT ${USER_FIELDS} FROM users WHERE id = ?
  `, [userId]);

  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(updated);
});

module.exports = router;
