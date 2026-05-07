// Apply SQL migrations in /migrations/ in lexical order. Idempotent — tracks
// which files have run in a `_migrations` table.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(process.env.DB_PATH || './harness.db');
const MIG_DIR = path.resolve(__dirname, '..', 'migrations');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const applied = new Set(db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename));
const files = fs.readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort();

for (const f of files) {
  if (applied.has(f)) continue;
  const sql = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
  db.exec('BEGIN');
  try {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(f);
    db.exec('COMMIT');
    console.log(`migrated: ${f}`);
  } catch (e) {
    db.exec('ROLLBACK');
    console.error(`migration failed: ${f}`, e.message);
    process.exit(1);
  }
}

db.close();
