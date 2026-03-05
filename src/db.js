const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, '../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'srtmap.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS syncs (
    token      TEXT PRIMARY KEY,
    plan       TEXT NOT NULL DEFAULT 'free',
    file_count INTEGER NOT NULL DEFAULT 0,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id           TEXT PRIMARY KEY,
    token        TEXT NOT NULL,
    name         TEXT NOT NULL,
    size         INTEGER NOT NULL,
    frames       INTEGER,
    valid_gps    INTEGER,
    zero_gps     INTEGER,
    storage_path TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (token) REFERENCES syncs(token) ON DELETE CASCADE
  );
`);

module.exports = db;
