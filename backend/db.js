const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join('/opt/nexus-pro', 'nexus.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin','admin','reseller')),
      credits INTEGER DEFAULT 0,
      max_credits INTEGER DEFAULT 0,
      expiry_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS protocol_quotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      protocol_id TEXT NOT NULL,
      max_accounts INTEGER DEFAULT 10,
      used_accounts INTEGER DEFAULT 0,
      UNIQUE(user_id, protocol_id)
    );

    CREATE TABLE IF NOT EXISTS vpn_accounts (
      id TEXT PRIMARY KEY,
      protocol TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      server_ip TEXT,
      domain TEXT,
      ns_domain TEXT,
      is_active INTEGER DEFAULT 1,
      config TEXT,
      uuid TEXT
    );

    CREATE TABLE IF NOT EXISTS server_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS protocols (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_enabled INTEGER DEFAULT 1,
      ports_json TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      username TEXT NOT NULL,
      target TEXT,
      protocol TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedSuperAdmin(username, password) {
  const d = getDb();
  const exists = d.prepare('SELECT id FROM users WHERE role = ?').get('super_admin');
  if (exists) return;
  const hash = bcrypt.hashSync(password, 10);
  const id = 'super-admin-' + Date.now();
  d.prepare(`INSERT INTO users (id, username, password_hash, role, credits, max_credits, expiry_date, created_at, is_active)
    VALUES (?, ?, ?, 'super_admin', 9999, 9999, '2099-12-31', datetime('now'), 1)`)
    .run(id, username, hash);
}

function seedServerConfig(config) {
  const d = getDb();
  const stmt = d.prepare('INSERT OR REPLACE INTO server_config (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(config)) {
    stmt.run(k, String(v));
  }
}

function seedProtocols(protocols) {
  const d = getDb();
  const stmt = d.prepare('INSERT OR IGNORE INTO protocols (id, name, description, icon, is_enabled, ports_json) VALUES (?, ?, ?, ?, ?, ?)');
  for (const p of protocols) {
    stmt.run(p.id, p.name, p.description, p.icon, p.isEnabled ? 1 : 0, JSON.stringify(p.ports));
  }
}

module.exports = { getDb, seedSuperAdmin, seedServerConfig, seedProtocols };
