/**
 * S3 Storage Helper (lib/storage.js)
 * ------------------------------------
 * Wraps @aws-sdk/client-s3 for OVH Object Storage (S3-compatible).
 *
 * Usage:
 *   const storage = require('./lib/storage');
 *   const { key, url } = await storage.upload(fileBuffer, originalName, folder);
 *   await storage.delete(key);
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');

const client = new S3Client({
  endpoint: `https://${process.env.S3_ENDPOINT}`,
  region: process.env.S3_REGION || 'gra',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // required for OVH S3
});

const BUCKET = process.env.S3_BUCKET;
const PUBLIC_URL = process.env.S3_PUBLIC_URL?.replace(/\/$/, '');

/**
 * Upload a file buffer to S3.
 * @param {Buffer} buffer - File content
 * @param {string} originalName - Original filename (used to get extension)
 * @param {string} folder - Subfolder in bucket e.g. 'invoices', 'documents', 'photos'
 * @returns {{ key: string, url: string }}
 */
async function upload(buffer, originalName, folder) {
  const ext = path.extname(originalName).toLowerCase();
  const uniqueId = crypto.randomBytes(12).toString('hex');
  const key = `${folder}/${uniqueId}${ext}`;

  const contentTypes = {
    '.pdf':  'application/pdf',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
  };
  const contentType = contentTypes[ext] || 'application/octet-stream';

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }));

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

/**
 * Delete a file from S3 by its key.
 * @param {string} key - The S3 object key (e.g. 'invoices/abc123.pdf')
 */
async function remove(key) {
  if (!key) return;
  await client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

module.exports = { upload, remove };
