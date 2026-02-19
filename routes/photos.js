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
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------
// Multer config
// ---------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'photos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    cb(null, id + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers JPG et PNG sont acceptés.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
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
  upload.array('photos', MAX_PHOTOS_PER_TYPE)(req, res, (err) => {
    if (err) {
      // Clean up if files were partially saved
      if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const { projectId } = req.params;
    const { userId, role, photoType } = req.body;
    const cleanupAll = () => req.files.forEach(f => fs.unlink(f.path, () => {}));

    if (!userId || !role) {
      cleanupAll();
      return res.status(400).json({ error: 'userId et role sont requis.' });
    }

    if (!['before', 'after'].includes(photoType)) {
      cleanupAll();
      return res.status(400).json({ error: 'photoType doit être "before" ou "after".' });
    }

    // Check project exists
    const project = req.db.getOne('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      cleanupAll();
      return res.status(404).json({ error: 'Projet introuvable.' });
    }

    // ARTISAN: must be assigned to this project
    if (role === 'ARTISAN') {
      const link = req.db.getOne(
        'SELECT 1 FROM project_artisans WHERE project_id = ? AND artisan_id = ?',
        [projectId, userId]
      );
      if (!link) {
        cleanupAll();
        return res.status(403).json({ error: 'Vous n\'êtes pas assigné à ce projet.' });
      }
    } else if (role !== 'ADMIN') {
      cleanupAll();
      return res.status(403).json({ error: 'Permission refusée.' });
    }

    // Check limit for this type
    const countRow = req.db.getOne(
      'SELECT COUNT(*) as c FROM project_photos WHERE project_id = ? AND photo_type = ?',
      [projectId, photoType]
    );
    const currentCount = countRow ? countRow.c : 0;
    const remaining = MAX_PHOTOS_PER_TYPE - currentCount;

    if (remaining <= 0) {
      cleanupAll();
      const label = photoType === 'before' ? 'avant' : 'après';
      return res.status(400).json({
        error: `Limite atteinte : maximum ${MAX_PHOTOS_PER_TYPE} photos "${label}" par projet.`
      });
    }

    if (req.files.length > remaining) {
      cleanupAll();
      const label = photoType === 'before' ? 'avant' : 'après';
      return res.status(400).json({
        error: `Il reste ${remaining} emplacement(s) pour les photos "${label}". Vous avez sélectionné ${req.files.length} fichier(s).`
      });
    }

    // Insert all files
    const uploadedAt = new Date().toISOString();
    const inserted = req.files.map((file, i) => {
      const id = 'ph_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6);
      req.db.run(
        `INSERT INTO project_photos (id, project_id, uploaded_by, photo_type, file_name, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, projectId, userId, photoType, file.filename, uploadedAt]
      );
      return {
        id,
        project_id: projectId,
        uploaded_by: userId,
        photo_type: photoType,
        file_name: file.filename,
        uploaded_at: uploadedAt,
      };
    });

    req.db.save();
    res.json(inserted);
  });
});

// ---------------------------------------------------------------
// DELETE /api/photos/:photoId
// ---------------------------------------------------------------
router.delete('/:photoId', (req, res) => {
  const { photoId } = req.params;
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'userId et role sont requis.' });
  }

  const photo = req.db.getOne('SELECT * FROM project_photos WHERE id = ?', [photoId]);
  if (!photo) return res.status(404).json({ error: 'Photo introuvable.' });

  if (role === 'ARTISAN') {
    // Must be the uploader
    if (photo.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres photos.' });
    }
    // Must be within 24h
    const uploadedAt = new Date(photo.uploaded_at);
    const now = new Date();
    const diffHours = (now - uploadedAt) / (1000 * 60 * 60);
    if (diffHours > 24) {
      return res.status(403).json({
        error: 'Le délai de suppression est dépassé (24h après l\'upload).'
      });
    }
  } else if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Permission refusée.' });
  }

  // Delete file from disk
  const filePath = path.join(UPLOAD_DIR, photo.file_name);
  if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});

  req.db.run('DELETE FROM project_photos WHERE id = ?', [photoId]);
  req.db.save();

  res.json({ success: true });
});

module.exports = router;
