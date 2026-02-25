/**
 * Photos Routes (routes/photos.js)
 * ---------------------------------
 * GET    /api/photos/:projectId          - Get all photos for a project
 * POST   /api/photos/:projectId          - Upload photos (artisan or admin, multiple allowed)
 * DELETE /api/photos/:photoId            - Delete a photo
 *
 * Rules:
 *  - Only jpg/png accepted, no size limit
 *  - Max 10 "before" + 10 "after" photos per project
 *  - ADMIN: can upload and delete anytime
 *  - ARTISAN: can upload if assigned to project; can delete only within 24h of upload
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3 = require('../lib/storage');

// Use memory storage — files go straight to S3
const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png/;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers JPG et PNG sont acceptés.'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const MAX_PHOTOS_PER_TYPE = 10;

// ---------------------------------------------------------------
// GET /api/photos/:projectId
// ---------------------------------------------------------------
router.get('/:projectId', (req, res) => {
  const { projectId } = req.params;

  const project = req.db.getOne('SELECT id FROM projects WHERE id = ?', [projectId]);
  if (!project) return res.status(404).json({ error: 'Projet introuvable.' });

  const photos = req.db.getAll(`
    SELECT pp.*, u.name AS uploader_name
    FROM project_photos pp
    LEFT JOIN users u ON pp.uploaded_by = u.id
    WHERE pp.project_id = ?
    ORDER BY pp.uploaded_at ASC
  `, [projectId]);

  res.json(photos);
});

// ---------------------------------------------------------------
// POST /api/photos/:projectId
// ---------------------------------------------------------------
router.post('/:projectId', (req, res) => {
  upload.array('photos', MAX_PHOTOS_PER_TYPE)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const { projectId } = req.params;
    const { userId, role, photoType } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'userId et role sont requis.' });
    }

    if (!['before', 'after'].includes(photoType)) {
      return res.status(400).json({ error: 'photoType doit être "before" ou "after".' });
    }

    const project = req.db.getOne('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });

    if (role === 'ARTISAN') {
      const link = req.db.getOne(
        'SELECT 1 FROM project_artisans WHERE project_id = ? AND artisan_id = ?',
        [projectId, userId]
      );
      if (!link) return res.status(403).json({ error: "Vous n'êtes pas assigné à ce projet." });
    } else if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permission refusée.' });
    }

    const countRow = req.db.getOne(
      'SELECT COUNT(*) as c FROM project_photos WHERE project_id = ? AND photo_type = ?',
      [projectId, photoType]
    );
    const currentCount = countRow ? countRow.c : 0;
    const remaining = MAX_PHOTOS_PER_TYPE - currentCount;

    if (remaining <= 0) {
      const label = photoType === 'before' ? 'avant' : 'après';
      return res.status(400).json({
        error: `Limite atteinte : maximum ${MAX_PHOTOS_PER_TYPE} photos "${label}" par projet.`
      });
    }

    if (req.files.length > remaining) {
      const label = photoType === 'before' ? 'avant' : 'après';
      return res.status(400).json({
        error: `Il reste ${remaining} emplacement(s) pour les photos "${label}". Vous avez sélectionné ${req.files.length} fichier(s).`
      });
    }

    try {
      const uploadedAt = new Date().toISOString();
      const inserted = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const { key, url } = await s3.upload(file.buffer, file.originalname, 'photos');

        const id = 'ph_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6);
        req.db.run(
          `INSERT INTO project_photos (id, project_id, uploaded_by, photo_type, file_name, file_url, file_key, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, projectId, userId, photoType, file.originalname, url, key, uploadedAt]
        );
        inserted.push({ id, project_id: projectId, uploaded_by: userId, photo_type: photoType,
          file_name: file.originalname, file_url: url, file_key: key, uploaded_at: uploadedAt });
      }

      req.db.save();
      res.json(inserted);

    } catch (uploadErr) {
      console.error('Photo upload error:', uploadErr);
      res.status(500).json({ error: "Erreur lors de l'upload des photos." });
    }
  });
});

// ---------------------------------------------------------------
// DELETE /api/photos/:photoId
// ---------------------------------------------------------------
router.delete('/:photoId', async (req, res) => {
  const { photoId } = req.params;
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'userId et role sont requis.' });
  }

  const photo = req.db.getOne('SELECT * FROM project_photos WHERE id = ?', [photoId]);
  if (!photo) return res.status(404).json({ error: 'Photo introuvable.' });

  if (role === 'ARTISAN') {
    if (photo.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres photos.' });
    }
    const uploadedAt = new Date(photo.uploaded_at);
    const now = new Date();
    const diffHours = (now - uploadedAt) / (1000 * 60 * 60);
    if (diffHours > 24) {
      return res.status(403).json({
        error: "Le délai de suppression est dépassé (24h après l'upload)."
      });
    }
  } else if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Permission refusée.' });
  }

  // Delete file from S3
  if (photo.file_key) {
    await s3.remove(photo.file_key).catch(err =>
      console.error('S3 delete photo error:', err)
    );
  }

  req.db.run('DELETE FROM project_photos WHERE id = ?', [photoId]);
  req.db.save();

  res.json({ success: true });
});

module.exports = router;
