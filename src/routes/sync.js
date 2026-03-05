const express = require('express');
const multer  = require('multer');
const { v4: uuid } = require('uuid');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');

const router = express.Router();

const UPLOAD_DIR   = process.env.STORAGE_PATH || path.join(__dirname, '../../uploads');
const FREE_FILES   = 100;
const FREE_BYTES   = 10 * 1024 * 1024; // 10 MB

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.token);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_, file, cb) => cb(null, `${uuid()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Token middleware ───────────────────────────────────────────────────────────
router.use((req, res, next) => {
  const token = req.headers['x-sync-token'] || req.query.token;
  if (!token) return next(); // token-less endpoints handled below
  let sync = db.prepare('SELECT * FROM syncs WHERE token = ?').get(token);
  if (!sync) {
    // Auto-create on first use — no account needed
    db.prepare('INSERT INTO syncs (token) VALUES (?)').run(token);
    sync = db.prepare('SELECT * FROM syncs WHERE token = ?').get(token);
  }
  req.token = token;
  req.sync  = sync;
  next();
});

// POST /api/sync/session — create a new anonymous sync token
router.post('/session', (req, res) => {
  const token = uuid();
  db.prepare('INSERT INTO syncs (token) VALUES (?)').run(token);
  res.json({ token });
});

// GET /api/sync — list files for this token
router.get('/', (req, res) => {
  if (!req.token) return res.status(401).json({ error: 'No sync token' });
  const files = db.prepare(
    'SELECT id, name, size, frames, valid_gps, zero_gps, created_at FROM files WHERE token = ? ORDER BY created_at DESC'
  ).all(req.token);
  res.json({ files, plan: req.sync.plan, file_count: req.sync.file_count, total_bytes: req.sync.total_bytes });
});

// POST /api/sync/upload — upload an SRT file
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.token) return res.status(401).json({ error: 'No sync token' });
  if (!req.file)  return res.status(400).json({ error: 'No file' });

  const { plan, file_count, total_bytes } = req.sync;
  if (plan === 'free') {
    if (file_count >= FREE_FILES || total_bytes + req.file.size > FREE_BYTES) {
      fs.unlinkSync(req.file.path);
      return res.status(402).json({ error: 'Free limit reached', limit: true });
    }
  }

  const id   = uuid();
  const meta = JSON.parse(req.body.meta || '{}');

  db.prepare(
    'INSERT INTO files (id, token, name, size, frames, valid_gps, zero_gps, storage_path) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, req.token, req.file.originalname, req.file.size, meta.frames || 0, meta.validGps || 0, meta.zeroGps || 0, req.file.path);

  db.prepare('UPDATE syncs SET file_count = file_count + 1, total_bytes = total_bytes + ? WHERE token = ?')
    .run(req.file.size, req.token);

  res.json({ id, name: req.file.originalname, size: req.file.size });
});

// GET /api/sync/file/:id — download an SRT file
router.get('/file/:id', (req, res) => {
  if (!req.token) return res.status(401).json({ error: 'No sync token' });
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND token = ?').get(req.params.id, req.token);
  if (!file) return res.status(404).json({ error: 'Not found' });
  res.download(file.storage_path, file.name);
});

// DELETE /api/sync/file/:id
router.delete('/file/:id', (req, res) => {
  if (!req.token) return res.status(401).json({ error: 'No sync token' });
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND token = ?').get(req.params.id, req.token);
  if (!file) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(file.storage_path); } catch (_) {}
  db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE syncs SET file_count = file_count - 1, total_bytes = MAX(0, total_bytes - ?) WHERE token = ?')
    .run(file.size, req.token);
  res.json({ ok: true });
});

module.exports = router;
