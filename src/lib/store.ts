import { User, VPNAccount, ServerConfig, SiteSettings, Protocol } from './types';
import { defaultProtocols } from './protocols';

// ============================================================
// LocalStorage-based persistent store
// No hardcoded accounts. Admin is created via install.sh
// ============================================================

const KEYS = {
  USERS: 'nexus_users',
  ACCOUNTS: 'nexus_accounts',
  SERVER_CONFIG: 'nexus_server_config',
  SITE_SETTINGS: 'nexus_site_settings',
  PROTOCOLS: 'nexus_protocols',
  ACTIVITY_LOG: 'nexus_activity_log',
  INITIALIZED: 'nexus_initialized',
} as const;

// Activity log entry
export interface ActivityEntry {
  id: string;
  action: string;
  user: string;
  target?: string;
  protocol?: string;
  timestamp: string;
}

// ---- Generic helpers ----
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---- Default server config (empty until install.sh seeds it) ----
const EMPTY_SERVER_CONFIG: ServerConfig = {
  ip: '',
  domain: '',
  nsDomain: '',
  slowdnsPub: '',
  openvpnDownload: '',
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'Nexus Pro Panel',
  sitePort: 8443,
  primaryColor: '#8a2be2',
  accentColor: '#ff0080',
  logoText: 'NEXUS PRO',
  footerText: '© 2026 Nexus Pro Panel. All rights reserved.',
  maintenanceMode: false,
  registrationEnabled: false,
  maxResellersPerAdmin: 100,
  defaultResellerDuration: 30,
  telegramBot: '',
  telegramChannel: '',
};

// ---- Initialize from nexus-config.json (written by install.sh) ----
export async function initializeFromServer(): Promise<boolean> {
  if (localStorage.getItem(KEYS.INITIALIZED)) return true;
  
  try {
    const res = await fetch('/nexus-config.json');
    if (!res.ok) return false;
    const cfg = await res.json();
    
    // Seed the super admin
    if (cfg.admin_user && cfg.admin_pass) {
      const superAdmin: User = {
        id: 'super-admin-' + Date.now(),
        username: cfg.admin_user,
        password: cfg.admin_pass,
        role: 'super_admin',
        credits: 9999,
        maxCredits: 9999,
        expiryDate: '2099-12-31',
        createdAt: new Date().toISOString().split('T')[0],
        isActive: true,
      };
      save(KEYS.USERS, [superAdmin]);
    }
    
    // Seed server config
    if (cfg.server_ip || cfg.domain) {
      save(KEYS.SERVER_CONFIG, {
        ip: cfg.server_ip || '',
        domain: cfg.domain || '',
        nsDomain: cfg.ns_domain || '',
        slowdnsPub: cfg.slowdns_pub || '',
        openvpnDownload: cfg.domain ? `https://${cfg.domain}:2081` : '',
      });
    }
    
    if (cfg.panel_port) {
      save(KEYS.SITE_SETTINGS, { ...DEFAULT_SITE_SETTINGS, sitePort: cfg.panel_port });
    }
    
    localStorage.setItem(KEYS.INITIALIZED, 'true');
    return true;
  } catch {
    return false;
  }
}

// ---- Users ----
export function getUsers(): User[] {
  return load<User[]>(KEYS.USERS, []);
}

export function saveUsers(users: User[]) {
  save(KEYS.USERS, users);
}

export function addUser(user: User) {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

export function removeUser(id: string): boolean {
  const users = getUsers();
  const target = users.find(u => u.id === id);
  if (target?.role === 'super_admin') return false;
  saveUsers(users.filter(u => u.id !== id));
  // Also remove all accounts created by this user if reseller
  if (target?.role === 'reseller') {
    const accounts = getAccounts().filter(a => a.createdBy !== id);
    saveAccounts(accounts);
  }
  return true;
}

export function updateUser(id: string, updates: Partial<User>) {
  const users = getUsers();
  saveUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
}

export function toggleUserActive(id: string) {
  const users = getUsers();
  const target = users.find(u => u.id === id);
  if (target?.role === 'super_admin') return;
  saveUsers(users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
}

// ---- VPN Accounts ----
export function getAccounts(): VPNAccount[] {
  return load<VPNAccount[]>(KEYS.ACCOUNTS, []);
}

export function saveAccounts(accounts: VPNAccount[]) {
  save(KEYS.ACCOUNTS, accounts);
}

export function addAccount(account: VPNAccount) {
  const accounts = getAccounts();
  accounts.push(account);
  saveAccounts(accounts);
}

export function removeAccount(id: string) {
  saveAccounts(getAccounts().filter(a => a.id !== id));
}

// ---- Server Config ----
export function getServerConfig(): ServerConfig {
  return load<ServerConfig>(KEYS.SERVER_CONFIG, EMPTY_SERVER_CONFIG);
}

export function saveServerConfig(config: ServerConfig) {
  save(KEYS.SERVER_CONFIG, config);
}

// ---- Site Settings ----
export function getSiteSettings(): SiteSettings {
  return load<SiteSettings>(KEYS.SITE_SETTINGS, DEFAULT_SITE_SETTINGS);
}

export function saveSiteSettings(settings: SiteSettings) {
  save(KEYS.SITE_SETTINGS, settings);
}

// ---- Protocols ----
export function getProtocols(): Protocol[] {
  return load<Protocol[]>(KEYS.PROTOCOLS, defaultProtocols);
}

export function saveProtocols(protocols: Protocol[]) {
  save(KEYS.PROTOCOLS, protocols);
}

// ---- Activity Log ----
export function getActivityLog(): ActivityEntry[] {
  return load<ActivityEntry[]>(KEYS.ACTIVITY_LOG, []);
}

export function addActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  const log = getActivityLog();
  log.unshift({
    ...entry,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  });
  // Keep last 100 entries
  save(KEYS.ACTIVITY_LOG, log.slice(0, 100));
}

// ---- Expiration Check ----
export function checkExpirations() {
  const now = new Date();
  const users = getUsers();
  let changed = false;
  
  users.forEach(u => {
    if (u.role === 'super_admin') return;
    if (u.role === 'admin') return; // Admins don't expire
    
    const expiry = new Date(u.expiryDate);
    if (expiry <= now && u.isActive) {
      u.isActive = false;
      changed = true;
      
      // Remove all VPN accounts created by this expired reseller
      const accounts = getAccounts().filter(a => a.createdBy !== u.id);
      saveAccounts(accounts);
      
      addActivity({
        action: 'Compte expiré (auto)',
        user: u.username,
        target: u.id,
      });
    }
  });
  
  if (changed) saveUsers(users);
  
  // Also check VPN account expirations
  const accounts = getAccounts();
  let accChanged = false;
  accounts.forEach(a => {
    const expiry = new Date(a.expiryDate);
    if (expiry <= now && a.isActive) {
      a.isActive = false;
      accChanged = true;
    }
  });
  if (accChanged) saveAccounts(accounts);
}

// ---- Has any admin been created? ----
export function hasAdmin(): boolean {
  return getUsers().some(u => u.role === 'super_admin' || u.role === 'admin');
}
