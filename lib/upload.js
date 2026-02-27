/**
 * Upload helpers (lib/upload.js)
 * --------------------------------
 * Shared multer instances used by invoices, documents, and photos routes.
 * All uploads use in-memory storage — files go straight to S3, never touching disk.
 *
 * Exports:
 *   documentUpload  — accepts PDF, JPG, JPEG, PNG (used by invoices + documents)
 *   photoUpload     — accepts JPG, JPEG, PNG only (used by photos)
 */

const multer = require('multer');

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

/**
 * Build a multer instance with memory storage and a mime-type allowlist.
 * @param {RegExp} allowedMimes - Pattern matched against file.mimetype
 * @param {string} errorMessage - Human-readable error for rejected files
 */
function makeUpload(allowedMimes, errorMessage) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter: (req, file, cb) => {
      if (allowedMimes.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(errorMessage));
      }
    },
  });
}

// PDF, JPG, JPEG, PNG — for invoices and compliance documents
const documentUpload = makeUpload(
  /pdf|jpg|jpeg|png/,
  'Seuls les fichiers PDF, JPG et PNG sont autorisés.'
);

// JPG, JPEG, PNG only — for project photos
const photoUpload = makeUpload(
  /jpg|jpeg|png/,
  'Seuls les fichiers JPG et PNG sont acceptés.'
);

module.exports = { documentUpload, photoUpload };
