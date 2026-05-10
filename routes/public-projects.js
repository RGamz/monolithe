/**
 * Public Projects Routes (routes/public-projects.js)
 * ----------------------------------------------------
 * No authentication required — used by the public "Nos Projets" page.
 *
 * GET /api/public/projects           - List favourite Terminé projects with cover photo
 * GET /api/public/projects/:id/photos - Approved before+after photos for a project
 */

const express = require('express');
const router = express.Router();

// GET /api/public/projects
router.get('/', (req, res) => {
  const projects = req.db.getAll(`
    SELECT id, title, description, cover_photo_id
    FROM projects
    WHERE is_favourite = 1 AND status = 'Terminé'
    ORDER BY start_date DESC
  `);

  const enriched = projects.map(project => {
    let cover_photo_url = null;

    // Use the admin-selected cover photo if it's approved
    if (project.cover_photo_id) {
      const cover = req.db.getOne(
        `SELECT file_url FROM project_photos
         WHERE id = ? AND moderation_status = 'approuvé'`,
        [project.cover_photo_id]
      );
      if (cover) cover_photo_url = cover.file_url;
    }

    // Fallback: first approved "après" photo ordered by upload date
    if (!cover_photo_url) {
      const fallback = req.db.getOne(
        `SELECT file_url FROM project_photos
         WHERE project_id = ? AND photo_type = 'after' AND moderation_status = 'approuvé'
         ORDER BY uploaded_at ASC LIMIT 1`,
        [project.id]
      );
      if (fallback) cover_photo_url = fallback.file_url;
    }

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      cover_photo_url,
    };
  });

  res.json(enriched);
});

// GET /api/public/projects/:id/photos
router.get('/:id/photos', (req, res) => {
  const { id } = req.params;

  const project = req.db.getOne(
    `SELECT id FROM projects WHERE id = ? AND is_favourite = 1 AND status = 'Terminé'`,
    [id]
  );
  if (!project) return res.status(404).json({ error: 'Projet introuvable.' });

  const photos = req.db.getAll(
    `SELECT id, file_url, photo_type
     FROM project_photos
     WHERE project_id = ? AND moderation_status = 'approuvé'
     ORDER BY photo_type DESC, uploaded_at ASC`,
    [id]
  );

  res.json(photos);
});

module.exports = router;