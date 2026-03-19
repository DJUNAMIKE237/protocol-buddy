const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDb, seedSuperAdmin, seedServerConfig, seedProtocols } = require('./db');

const app = express();
const CONFIG_PATH = '/opt/nexus-pro/config.json';
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

// Save JWT secret for persistence
const secretPath = '/opt/nexus-pro/.jwt_secret';
if (!fs.existsSync(secretPath)) {
  fs.writeFileSync(secretPath, JWT_SECRET, { mode: 0o600 });
}
const ACTUAL_SECRET = fs.existsSync(secretPath) ? fs.readFileSync(secretPath, 'utf8').trim() : JWT_SECRET;

app.use(cors());
app.use(express.json());

// ── Initialize DB from config.json ──
function initialize() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Config file not found. Run install.sh first.');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  seedSuperAdmin(cfg.admin_user, cfg.admin_pass);
  seedServerConfig({
    ip: cfg.server_ip,
    domain: cfg.domain,
    ns_domain: cfg.ns_domain,
    slowdns_pub: cfg.slowdns_pub || '',
    openvpn_download: `https://${cfg.domain}:2081`,
    xray_uuid: cfg.xray_uuid || '',
  });
  seedProtocols(require('./default-protocols.json'));
}

// ── Auth Middleware ──
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  try {
    req.user = jwt.verify(token, ACTUAL_SECRET);
    // Verify user still exists and is active
    const db = getDb();
    const u = db.prepare('SELECT id, role, is_active FROM users WHERE id = ?').get(req.user.id);
    if (!u || !u.is_active) return res.status(401).json({ error: 'Compte désactivé' });
    req.user.role = u.role;
    next();
  } catch { return res.status(401).json({ error: 'Token invalide' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' });
    next();
  };
}

// ══════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !user.is_active) return res.status(401).json({ error: 'Identifiants invalides' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Identifiants invalides' });

  const token = jwt.sign({ id: user.id, role: user.role }, ACTUAL_SECRET, { expiresIn: '24h' });
  const quotas = db.prepare('SELECT * FROM protocol_quotas WHERE user_id = ?').all(user.id);

  db.prepare('INSERT INTO activity_log (action, username) VALUES (?, ?)').run('Connexion', user.username);

  res.json({
    token,
    user: {
      id: user.id, username: user.username, role: user.role,
      credits: user.credits, maxCredits: user.max_credits,
      expiryDate: user.expiry_date, createdAt: user.created_at,
      isActive: !!user.is_active,
      bouquet: quotas.map(q => ({ protocolId: q.protocol_id, maxAccounts: q.max_accounts, usedAccounts: q.used_accounts })),
    },
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  const quotas = db.prepare('SELECT * FROM protocol_quotas WHERE user_id = ?').all(user.id);
  res.json({
    id: user.id, username: user.username, role: user.role,
    credits: user.credits, maxCredits: user.max_credits,
    expiryDate: user.expiry_date, createdAt: user.created_at,
    isActive: !!user.is_active,
    bouquet: quotas.map(q => ({ protocolId: q.protocol_id, maxAccounts: q.max_accounts, usedAccounts: q.used_accounts })),
  });
});

app.get('/api/auth/has-admin', (req, res) => {
  const db = getDb();
  const admin = db.prepare("SELECT id FROM users WHERE role IN ('super_admin','admin') LIMIT 1").get();
  res.json({ hasAdmin: !!admin });
});

// ══════════════════════════════════════
// USERS ROUTES (Admin only)
// ══════════════════════════════════════
app.get('/api/users', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const result = users.map(u => {
    const quotas = db.prepare('SELECT * FROM protocol_quotas WHERE user_id = ?').all(u.id);
    return {
      id: u.id, username: u.username, role: u.role,
      credits: u.credits, maxCredits: u.max_credits,
      expiryDate: u.expiry_date, createdAt: u.created_at,
      createdBy: u.created_by, isActive: !!u.is_active,
      bouquet: quotas.map(q => ({ protocolId: q.protocol_id, maxAccounts: q.max_accounts, usedAccounts: q.used_accounts })),
    };
  });
  res.json(result);
});

app.post('/api/users', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const { username, password, role, credits, maxCredits, expiryDate, bouquet } = req.body;

  // Only super_admin can create admins
  if (role === 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Seul le Super Admin peut créer des administrateurs' });
  }
  if (role === 'super_admin') return res.status(403).json({ error: 'Impossible de créer un Super Admin' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });

  const id = Date.now().toString();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, username, password_hash, role, credits, max_credits, expiry_date, created_at, created_by, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 1)`)
    .run(id, username, hash, role, credits || 0, maxCredits || 0, expiryDate, req.user.id);

  if (bouquet && Array.isArray(bouquet)) {
    const stmt = db.prepare('INSERT INTO protocol_quotas (user_id, protocol_id, max_accounts, used_accounts) VALUES (?, ?, ?, 0)');
    for (const b of bouquet) {
      stmt.run(id, b.protocolId, b.maxAccounts);
    }
  }

  db.prepare('INSERT INTO activity_log (action, username, target) VALUES (?, ?, ?)')
    .run(role === 'admin' ? 'Admin créé' : 'Revendeur créé', req.user.username || 'system', username);

  res.json({ id, username, role });
});

app.patch('/api/users/:id', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  if (target.role === 'super_admin' && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Accès refusé' });

  const { isActive, credits, maxCredits, expiryDate, password } = req.body;
  if (isActive !== undefined) db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, req.params.id);
  if (credits !== undefined) db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(credits, req.params.id);
  if (maxCredits !== undefined) db.prepare('UPDATE users SET max_credits = ? WHERE id = ?').run(maxCredits, req.params.id);
  if (expiryDate) db.prepare('UPDATE users SET expiry_date = ? WHERE id = ?').run(expiryDate, req.params.id);
  if (password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);

  res.json({ success: true });
});

app.delete('/api/users/:id', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Non trouvé' });
  if (target.role === 'super_admin') return res.status(403).json({ error: 'Impossible de supprimer le Super Admin' });
  if (target.role === 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Accès refusé' });

  // Delete VPN accounts created by this user from the system
  const accounts = db.prepare('SELECT * FROM vpn_accounts WHERE created_by = ?').all(req.params.id);
  for (const acc of accounts) {
    deleteSystemAccount(acc);
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO activity_log (action, username, target) VALUES (?, ?, ?)')
    .run('Utilisateur supprimé', req.user.username || 'system', target.username);
  res.json({ success: true });
});

app.patch('/api/users/:id/toggle', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Non trouvé' });
  if (target.role === 'super_admin') return res.status(403).json({ error: 'Impossible' });

  const newStatus = target.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);

  db.prepare('INSERT INTO activity_log (action, username, target) VALUES (?, ?, ?)')
    .run(newStatus ? 'Compte activé' : 'Compte désactivé', req.user.username || 'system', target.username);
  res.json({ isActive: !!newStatus });
});

// ══════════════════════════════════════
// VPN ACCOUNTS ROUTES
// ══════════════════════════════════════
app.get('/api/accounts', auth, (req, res) => {
  const db = getDb();
  let accounts;
  if (req.user.role === 'reseller') {
    accounts = db.prepare('SELECT * FROM vpn_accounts WHERE created_by = ? ORDER BY created_at DESC').all(req.user.id);
  } else {
    accounts = db.prepare('SELECT * FROM vpn_accounts ORDER BY created_at DESC').all();
  }
  res.json(accounts.map(a => ({
    id: a.id, protocol: a.protocol, username: a.username, password: a.password,
    expiryDate: a.expiry_date, createdAt: a.created_at, createdBy: a.created_by,
    serverIp: a.server_ip, domain: a.domain, nsDomain: a.ns_domain,
    isActive: !!a.is_active, config: a.config, uuid: a.uuid,
  })));
});

app.post('/api/accounts', auth, (req, res) => {
  const db = getDb();
  const { protocol, username, password, duration } = req.body;
  const serverCfg = getServerConfigObj();

  // Validate reseller quota & duration
  if (req.user.role === 'reseller') {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const quota = db.prepare('SELECT * FROM protocol_quotas WHERE user_id = ? AND protocol_id = ?').get(req.user.id, protocol);
    if (!quota) return res.status(403).json({ error: 'Protocole non autorisé' });
    if (quota.used_accounts >= quota.max_accounts) return res.status(403).json({ error: 'Quota atteint' });

    // Check duration doesn't exceed reseller expiry
    const maxMs = new Date(user.expiry_date).getTime() - Date.now();
    const maxDays = Math.floor(maxMs / 86400000);
    if (duration > maxDays) return res.status(400).json({ error: `Durée max: ${maxDays} jours` });
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + duration * 86400000);
  const id = Date.now().toString();
  let uuid = null;

  // ── Create account on the system ──
  try {
    const result = createSystemAccount(protocol, username, password, duration, serverCfg);
    uuid = result.uuid;
  } catch (err) {
    return res.status(500).json({ error: `Erreur création système: ${err.message}` });
  }

  // Generate config text
  const config = generateConfig(protocol, username, password, expiry, serverCfg, uuid);

  db.prepare(`INSERT INTO vpn_accounts (id, protocol, username, password, expiry_date, created_at, created_by, server_ip, domain, ns_domain, is_active, config, uuid)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, 1, ?, ?)`)
    .run(id, protocol, username, password, expiry.toISOString().split('T')[0], req.user.id,
      serverCfg.ip, serverCfg.domain, serverCfg.ns_domain, config, uuid);

  // Update quota
  if (req.user.role === 'reseller') {
    db.prepare('UPDATE protocol_quotas SET used_accounts = used_accounts + 1 WHERE user_id = ? AND protocol_id = ?')
      .run(req.user.id, protocol);
  }

  db.prepare('INSERT INTO activity_log (action, username, target, protocol) VALUES (?, ?, ?, ?)')
    .run(`Compte ${protocol.toUpperCase()} créé`, req.user.username || 'system', username, protocol);

  res.json({ id, protocol, username, config, uuid });
});

app.delete('/api/accounts/:id', auth, (req, res) => {
  const db = getDb();
  const acc = db.prepare('SELECT * FROM vpn_accounts WHERE id = ?').get(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Non trouvé' });

  // Resellers can only delete their own
  if (req.user.role === 'reseller' && acc.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  // Delete from system
  deleteSystemAccount(acc);

  // Restore quota
  if (acc.created_by) {
    db.prepare('UPDATE protocol_quotas SET used_accounts = MAX(0, used_accounts - 1) WHERE user_id = ? AND protocol_id = ?')
      .run(acc.created_by, acc.protocol);
  }

  db.prepare('DELETE FROM vpn_accounts WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO activity_log (action, username, target, protocol) VALUES (?, ?, ?, ?)')
    .run(`Compte ${acc.protocol.toUpperCase()} supprimé`, req.user.username || 'system', acc.username, acc.protocol);
  res.json({ success: true });
});

// ══════════════════════════════════════
// SERVER CONFIG & SETTINGS
// ══════════════════════════════════════
app.get('/api/server-config', auth, requireRole('super_admin'), (req, res) => {
  res.json(getServerConfigObj());
});

app.put('/api/server-config', auth, requireRole('super_admin'), (req, res) => {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO server_config (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(req.body)) {
    stmt.run(k, String(v));
  }
  res.json({ success: true });
});

app.get('/api/site-settings', auth, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({
    siteName: settings.siteName || 'Nexus Pro Panel',
    sitePort: parseInt(settings.sitePort) || 8443,
    primaryColor: settings.primaryColor || '#8a2be2',
    accentColor: settings.accentColor || '#ff0080',
    logoText: settings.logoText || 'NEXUS PRO',
    footerText: settings.footerText || '© 2026 Nexus Pro Panel',
    maintenanceMode: settings.maintenanceMode === 'true',
    registrationEnabled: settings.registrationEnabled === 'true',
    maxResellersPerAdmin: parseInt(settings.maxResellersPerAdmin) || 100,
    defaultResellerDuration: parseInt(settings.defaultResellerDuration) || 30,
    telegramBot: settings.telegramBot || '',
    telegramChannel: settings.telegramChannel || '',
  });
});

app.put('/api/site-settings', auth, requireRole('super_admin'), (req, res) => {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(req.body)) {
    stmt.run(k, String(v));
  }
  res.json({ success: true });
});

// ══════════════════════════════════════
// PROTOCOLS
// ══════════════════════════════════════
app.get('/api/protocols', auth, (req, res) => {
  const db = getDb();
  const protos = db.prepare('SELECT * FROM protocols').all();
  res.json(protos.map(p => ({
    id: p.id, name: p.name, description: p.description, icon: p.icon,
    isEnabled: !!p.is_enabled, ports: JSON.parse(p.ports_json || '[]'),
  })));
});

app.patch('/api/protocols/:id', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const { isEnabled } = req.body;
  db.prepare('UPDATE protocols SET is_enabled = ? WHERE id = ?').run(isEnabled ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════
app.get('/api/activity', auth, requireRole('super_admin', 'admin'), (req, res) => {
  const db = getDb();
  const log = db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 100').all();
  res.json(log.map(l => ({
    id: l.id.toString(), action: l.action, user: l.username,
    target: l.target, protocol: l.protocol, timestamp: l.timestamp,
  })));
});

// ══════════════════════════════════════
// SYSTEM ACCOUNT MANAGEMENT
// ══════════════════════════════════════
function getServerConfigObj() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM server_config').all();
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

function createSystemAccount(protocol, username, password, days, serverCfg) {
  const expiry = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  let uuid = null;

  switch (protocol) {
    case 'ssh':
    case 'slowdns': {
      // Create Linux user for SSH/SlowDNS
      try { execSync(`userdel -f ${username} 2>/dev/null`); } catch {}
      execSync(`useradd -M -s /bin/false -e ${expiry} ${username}`);
      execSync(`echo '${username}:${password}' | chpasswd`);
      break;
    }
    case 'vmess':
    case 'vless':
    case 'trojan':
    case 'socks': {
      // Add client to Xray config
      uuid = require('crypto').randomUUID();
      addXrayClient(protocol, username, uuid, password);
      execSync('systemctl restart xray');
      break;
    }
    case 'openvpn': {
      // Create Linux user for OpenVPN auth
      try { execSync(`userdel -f ${username} 2>/dev/null`); } catch {}
      execSync(`useradd -M -s /bin/false -e ${expiry} ${username}`);
      execSync(`echo '${username}:${password}' | chpasswd`);
      break;
    }
    case 'udp-custom': {
      // UDP Custom uses SSH auth
      try { execSync(`userdel -f ${username} 2>/dev/null`); } catch {}
      execSync(`useradd -M -s /bin/false -e ${expiry} ${username}`);
      execSync(`echo '${username}:${password}' | chpasswd`);
      break;
    }
  }

  return { uuid };
}

function deleteSystemAccount(acc) {
  try {
    switch (acc.protocol) {
      case 'ssh':
      case 'slowdns':
      case 'openvpn':
      case 'udp-custom':
        execSync(`userdel -f ${acc.username} 2>/dev/null`);
        break;
      case 'vmess':
      case 'vless':
      case 'trojan':
      case 'socks':
        removeXrayClient(acc.protocol, acc.uuid || acc.username);
        try { execSync('systemctl restart xray'); } catch {}
        break;
    }
  } catch (err) {
    console.error(`Error deleting system account ${acc.username}:`, err.message);
  }
}

function addXrayClient(protocol, username, uuid, password) {
  const cfgPath = '/usr/local/etc/xray/config.json';
  if (!fs.existsSync(cfgPath)) return;

  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const tagMap = {
    vmess: ['vmess-ws', 'vmess-grpc'],
    vless: ['vless-ws', 'vless-grpc'],
    trojan: ['trojan-ws', 'trojan-grpc'],
    socks: ['socks-ws', 'socks-grpc'],
  };

  const tags = tagMap[protocol] || [];
  for (const inbound of cfg.inbounds) {
    if (!tags.includes(inbound.tag)) continue;

    if (protocol === 'trojan') {
      if (!inbound.settings.clients) inbound.settings.clients = [];
      inbound.settings.clients.push({ password: uuid, email: username });
    } else if (protocol === 'socks') {
      if (!inbound.settings.accounts) inbound.settings.accounts = [];
      inbound.settings.accounts.push({ user: username, pass: password });
    } else {
      // vmess, vless
      if (!inbound.settings.clients) inbound.settings.clients = [];
      inbound.settings.clients.push({ id: uuid, email: username });
    }
  }

  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

function removeXrayClient(protocol, uuidOrUsername) {
  const cfgPath = '/usr/local/etc/xray/config.json';
  if (!fs.existsSync(cfgPath)) return;

  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const tagMap = {
    vmess: ['vmess-ws', 'vmess-grpc'],
    vless: ['vless-ws', 'vless-grpc'],
    trojan: ['trojan-ws', 'trojan-grpc'],
    socks: ['socks-ws', 'socks-grpc'],
  };

  const tags = tagMap[protocol] || [];
  for (const inbound of cfg.inbounds) {
    if (!tags.includes(inbound.tag)) continue;
    if (protocol === 'socks') {
      inbound.settings.accounts = (inbound.settings.accounts || []).filter(a => a.user !== uuidOrUsername);
    } else if (protocol === 'trojan') {
      inbound.settings.clients = (inbound.settings.clients || []).filter(c => c.password !== uuidOrUsername);
    } else {
      inbound.settings.clients = (inbound.settings.clients || []).filter(c => c.id !== uuidOrUsername);
    }
  }

  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

// ══════════════════════════════════════
// CONFIG TEXT GENERATOR
// ══════════════════════════════════════
function generateConfig(protocol, username, password, expiry, cfg, uuid) {
  const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const expiryStr = expiry.toISOString().split('T')[0];
  const domain = cfg.domain;
  const ip = cfg.ip;
  const ns = cfg.ns_domain;
  const pub = cfg.slowdns_pub || '';

  switch (protocol) {
    case 'ssh':
      return `┏${LINE}┓
┃               SSH ACCOUNT DETAILS                ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Password    : ${password}
┃ Expiry Date : ${expiryStr}
┃ Host/IP     : ${ip}
┃ Domain      : ${domain}
┃ NS Domain   : ${ns}
●${LINE}●
┃ OpenSSH      : 22
┃ Dropbear     : 109, 143
┃ Stunnel      : 447, 777
┃ WS NTLS      : 80
┃ WS TLS       : 443
┃ UDPGW        : 7100–7900
┃ Squid        : 3128, 8080
●${LINE}●
┃ UDP Custom
┃ ${domain}:1-65535@${username}:${password}
●${LINE}●
┃ Slow DNS
┃ PUB : ${pub}
●${LINE}●
┃ Payload
┃ GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]
┗${LINE}┛`;

    case 'vmess': {
      const vmessObj = { v: "2", ps: username, add: domain, port: "443", id: uuid, aid: "0", scy: "auto", net: "ws", type: "none", host: domain, path: "/vmess", tls: "tls" };
      const vmessLink = 'vmess://' + Buffer.from(JSON.stringify(vmessObj)).toString('base64');
      const vmessNtls = { ...vmessObj, port: "80", tls: "" };
      const vmessNtlsLink = 'vmess://' + Buffer.from(JSON.stringify(vmessNtls)).toString('base64');
      return `┏${LINE}┓
┃              VMESS ACCOUNT DETAILS               ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Expiry Date : ${expiryStr}
┃ UUID        : ${uuid}
●${LINE}●
┃ Domain      : ${domain}
┃ Port TLS    : 443
┃ Port NonTLS : 80
┃ Port gRPC   : 443
┃ Security    : auto
┃ Network     : ws
┃ Path        : /vmess
●${LINE}●
┃ TLS  :
┃ ${vmessLink}
┃
┃ NTLS :
┃ ${vmessNtlsLink}
┗${LINE}┛`;
    }

    case 'vless':
      return `┏${LINE}┓
┃              VLESS ACCOUNT DETAILS               ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Expiry Date : ${expiryStr}
┃ UUID        : ${uuid}
●${LINE}●
┃ Domain      : ${domain}
┃ Port TLS    : 443
┃ Port NonTLS : 80
┃ Port gRPC   : 443
┃ Security    : auto
┃ Network     : ws
┃ Path        : /vless
●${LINE}●
┃ Custom Path Info
┃ TLS         : 2087
┃ NTLS        : 2086
┃ PATH        : / OR /<anytext>
●${LINE}●
┃ TLS  :
┃ vless://${uuid}@${domain}:443?path=/vless&security=tls&encryption=none&type=ws#${username}
┃
┃ NTLS :
┃ vless://${uuid}@${domain}:80?path=/vless&encryption=none&type=ws#${username}
┃
┃ GRPC :
┃ vless://${uuid}@${domain}:443?mode=gun&security=tls&encryption=none&type=grpc&serviceName=vless-grpc#${username}
┗${LINE}┛`;

    case 'trojan':
      return `┏${LINE}┓
┃             TROJAN ACCOUNT DETAILS               ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Expiry Date : ${expiryStr}
┃ UUID        : ${uuid}
●${LINE}●
┃ Domain      : ${domain}
┃ Port TLS    : 443
┃ Port gRPC   : 443
┃ Network     : ws
┃ Path        : /trws
●${LINE}●
┃ TLS  :
┃ trojan://${uuid}@${domain}:443?path=/trws&security=tls&type=ws#${username}
┃
┃ GRPC :
┃ trojan://${uuid}@${domain}:443?mode=gun&security=tls&type=grpc&serviceName=trojan-grpc#${username}
┗${LINE}┛`;

    case 'socks':
      return `┏${LINE}┓
┃             SOCKS ACCOUNT DETAILS                ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Password    : ${password}
┃ Expiry Date : ${expiryStr}
●${LINE}●
┃ Domain      : ${domain}
┃ Port TLS    : 443
┃ Port NonTLS : 80
┃ Network     : ws
┃ Path        : /ssws
●${LINE}●
┃ TLS  :
┃ socks://${username}:${password}@${domain}:443?path=/ssws&security=tls&type=ws#${username}
┃
┃ GRPC :
┃ socks://${username}:${password}@${domain}:443?security=tls&type=grpc&serviceName=socks-grpc#${username}
┗${LINE}┛`;

    case 'openvpn':
      return `┏${LINE}┓
┃           OPENVPN ACCOUNT DETAILS                ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Password    : ${password}
┃ Expiry Date : ${expiryStr}
┃ Host/IP     : ${ip}
●${LINE}●
┃ OpenVPN TCP  : 1194
┃ OpenVPN SSL  : 2200
┃ OHP          : 8000
●${LINE}●
┃ Config File
┃ Download     : https://${domain}:2081
┗${LINE}┛`;

    case 'slowdns':
      return `┏${LINE}┓
┃           SLOW DNS ACCOUNT DETAILS               ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Password    : ${password}
┃ Expiry Date : ${expiryStr}
┃ NS Domain   : ${ns}
●${LINE}●
┃ Ports       : 22,53,5300,80,443
┃ PUB Key     : ${pub}
┗${LINE}┛`;

    case 'udp-custom':
      return `┏${LINE}┓
┃          UDP CUSTOM ACCOUNT DETAILS              ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${username}
┃ Password    : ${password}
┃ Expiry Date : ${expiryStr}
●${LINE}●
┃ Auth String
┃ ${domain}:1-65535@${username}:${password}
┗${LINE}┛`;

    default:
      return '';
  }
}

// ══════════════════════════════════════
// EXPIRATION CRON (every minute)
// ══════════════════════════════════════
cron.schedule('* * * * *', () => {
  const db = getDb();
  const now = new Date().toISOString().split('T')[0];

  // Expire resellers
  const expiredUsers = db.prepare("SELECT * FROM users WHERE role = 'reseller' AND is_active = 1 AND expiry_date <= ?").all(now);
  for (const u of expiredUsers) {
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(u.id);
    // Delete all VPN accounts created by this reseller
    const accounts = db.prepare('SELECT * FROM vpn_accounts WHERE created_by = ?').all(u.id);
    for (const acc of accounts) {
      deleteSystemAccount(acc);
      db.prepare('DELETE FROM vpn_accounts WHERE id = ?').run(acc.id);
    }
    db.prepare('INSERT INTO activity_log (action, username, target) VALUES (?, ?, ?)')
      .run('Compte expiré (auto)', 'system', u.username);
  }

  // Expire VPN accounts
  const expiredAccounts = db.prepare('SELECT * FROM vpn_accounts WHERE is_active = 1 AND expiry_date <= ?').all(now);
  for (const a of expiredAccounts) {
    deleteSystemAccount(a);
    db.prepare('UPDATE vpn_accounts SET is_active = 0 WHERE id = ?').run(a.id);
  }
});

// ── Start ──
const PORT = process.env.API_PORT || 3001;
initialize();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nexus Pro API running on port ${PORT}`);
});
