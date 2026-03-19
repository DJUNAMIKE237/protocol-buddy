import { User, VPNAccount, ServerConfig, SiteSettings, Protocol, ProtocolQuota } from './types';

// API base URL — in production, this points to the VPS backend
const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken: string | null = localStorage.getItem('nexus_token');

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers(), ...options?.headers } });
  if (res.status === 401) {
    authToken = null;
    localStorage.removeItem('nexus_token');
    window.location.reload();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

// ── Auth ──
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ username, password }),
  });
  authToken = data.token;
  localStorage.setItem('nexus_token', data.token);
  return data;
}

export function logout() {
  authToken = null;
  localStorage.removeItem('nexus_token');
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export async function hasAdmin(): Promise<boolean> {
  const data = await request<{ hasAdmin: boolean }>('/auth/has-admin');
  return data.hasAdmin;
}

export function isLoggedIn(): boolean {
  return !!authToken;
}

// ── Users ──
export async function getUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function createUser(data: {
  username: string; password: string; role: string;
  credits?: number; maxCredits?: number; expiryDate: string;
  bouquet?: { protocolId: string; maxAccounts: number }[];
}): Promise<{ id: string }> {
  return request('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id: string, updates: Partial<{ isActive: boolean; credits: number; maxCredits: number; expiryDate: string; password: string }>): Promise<void> {
  await request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/users/${id}`, { method: 'DELETE' });
}

export async function toggleUser(id: string): Promise<{ isActive: boolean }> {
  return request(`/users/${id}/toggle`, { method: 'PATCH' });
}

// ── VPN Accounts ──
export async function getAccounts(): Promise<VPNAccount[]> {
  return request<VPNAccount[]>('/accounts');
}

export async function createAccount(data: {
  protocol: string; username: string; password: string; duration: number;
}): Promise<{ id: string; config: string; uuid?: string }> {
  return request('/accounts', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteAccount(id: string): Promise<void> {
  await request(`/accounts/${id}`, { method: 'DELETE' });
}

// ── Server Config ──
export async function getServerConfig(): Promise<ServerConfig> {
  const data = await request<Record<string, string>>('/server-config');
  return {
    ip: data.ip || '',
    domain: data.domain || '',
    nsDomain: data.ns_domain || '',
    slowdnsPub: data.slowdns_pub || '',
    openvpnDownload: data.openvpn_download || '',
  };
}

export async function saveServerConfig(config: ServerConfig): Promise<void> {
  await request('/server-config', {
    method: 'PUT',
    body: JSON.stringify({
      ip: config.ip, domain: config.domain,
      ns_domain: config.nsDomain, slowdns_pub: config.slowdnsPub,
      openvpn_download: config.openvpnDownload,
    }),
  });
}

// ── Site Settings ──
export async function getSiteSettings(): Promise<SiteSettings> {
  return request<SiteSettings>('/site-settings');
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  await request('/site-settings', { method: 'PUT', body: JSON.stringify(settings) });
}

// ── Protocols ──
export async function getProtocols(): Promise<Protocol[]> {
  return request<Protocol[]>('/protocols');
}

export async function toggleProtocol(id: string, isEnabled: boolean): Promise<void> {
  await request(`/protocols/${id}`, { method: 'PATCH', body: JSON.stringify({ isEnabled }) });
}

// ── Activity ──
export interface ActivityEntry {
  id: string;
  action: string;
  user: string;
  target?: string;
  protocol?: string;
  timestamp: string;
}

export async function getActivityLog(): Promise<ActivityEntry[]> {
  return request<ActivityEntry[]>('/activity');
}
