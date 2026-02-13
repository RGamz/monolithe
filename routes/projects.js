/**
 * Projects Routes (routes/projects.js)
 * -------------------------------------
 * GET    /api/projects?userId=...&role=...  - Get projects filtered by role
 * POST   /api/projects                       - Create a new project
 * PUT    /api/projects/:id                   - Update an existing project
 * DELETE /api/projects/:id                   - Delete a project
 */

const express = require('express');
const router = express.Router();

// GET /api/projects
router.get('/', (req, res) => {
  const { userId, role } = req.query;

  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required' });
  }

  let projects;

  if (role === 'ADMIN') {
    projects = req.db.getAll(`
      SELECT p.*, u.name AS client_name, u.company_name AS client_company
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      ORDER BY p.start_date DESC
    `);
  } else if (role === 'ARTISAN') {
    projects = req.db.getAll(`
      SELECT p.*, u.name AS client_name, u.company_name AS client_company
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      INNER JOIN project_artisans pa ON pa.project_id = p.id
      WHERE pa.artisan_id = ?
      ORDER BY p.start_date DESC
    `, [userId]);
  } else if (role === 'CLIENT') {
    projects = req.db.getAll(`
      SELECT p.*, u.name AS client_name, u.company_name AS client_company
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      WHERE p.client_id = ?
      ORDER BY p.start_date DESC
    `, [userId]);
  } else {
    return res.json([]);
  }

  // Enrich each project with artisan info
  const enriched = projects.map(project => {
    const artisans = req.db.getAll(`
      SELECT pa.artisan_id, u.name, u.company_name
      FROM project_artisans pa
      LEFT JOIN users u ON pa.artisan_id = u.id
      WHERE pa.project_id = ?
    `, [project.id]);

    return {
      ...project,
      artisan_ids: artisans.map(a => a.artisan_id),
      artisan_names: artisans.map(a => a.company_name || a.name),
    };
  });

  res.json(enriched);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { title, client_id, status, start_date, description, artisan_ids } = req.body;

  if (!title || !client_id) {
    return res.status(400).json({ error: 'Title and client_id are required' });
  }

  const id = 'p' + Date.now();

  req.db.run(`
    INSERT INTO projects (id, title, client_id, status, start_date, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, title, client_id, status || 'En attente', start_date || null, description || '']);

  // Link artisans
  if (artisan_ids && artisan_ids.length > 0) {
    for (const artisanId of artisan_ids) {
      req.db.run('INSERT INTO project_artisans (project_id, artisan_id) VALUES (?, ?)', [id, artisanId]);
    }
  }

  req.db.save();
  res.json({ id, title, client_id, status: status || 'En attente' });
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, client_id, status, start_date, description, end_of_work_signed, artisan_ids } = req.body;

  if (!title || !client_id) {
    return res.status(400).json({ error: 'Title and client_id are required' });
  }

  const existing = req.db.getOne('SELECT * FROM projects WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  req.db.run(`
    UPDATE projects SET title = ?, client_id = ?, status = ?, start_date = ?, description = ?, end_of_work_signed = ?
    WHERE id = ?
  `, [title, client_id, status || 'En attente', start_date || null, description || '', end_of_work_signed ? 1 : 0, id]);

  // Replace artisan assignments
  req.db.run('DELETE FROM project_artisans WHERE project_id = ?', [id]);
  if (artisan_ids && artisan_ids.length > 0) {
    for (const artisanId of artisan_ids) {
      req.db.run('INSERT INTO project_artisans (project_id, artisan_id) VALUES (?, ?)', [id, artisanId]);
    }
  }

  req.db.save();

  const updated = req.db.getOne(`
    SELECT p.*, u.name AS client_name, u.company_name AS client_company
    FROM projects p LEFT JOIN users u ON p.client_id = u.id
    WHERE p.id = ?
  `, [id]);

  const artisans = req.db.getAll(`
    SELECT pa.artisan_id, u.name, u.company_name
    FROM project_artisans pa LEFT JOIN users u ON pa.artisan_id = u.id
    WHERE pa.project_id = ?
  `, [id]);

  res.json({
    ...updated,
    artisan_ids: artisans.map(a => a.artisan_id),
    artisan_names: artisans.map(a => a.company_name || a.name),
  });
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = req.db.getOne('SELECT * FROM projects WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  req.db.run('DELETE FROM project_artisans WHERE project_id = ?', [id]);
  req.db.run('DELETE FROM invoices WHERE project_id = ?', [id]);
  req.db.run('DELETE FROM projects WHERE id = ?', [id]);
  req.db.save();

  res.json({ success: true });
});

module.exports = router;
