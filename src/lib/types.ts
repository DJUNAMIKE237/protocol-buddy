export type UserRole = 'admin' | 'reseller';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  credits: number;
  maxCredits: number;
  expiryDate: string;
  createdAt: string;
  isActive: boolean;
}

export type ProtocolType = 'ssh' | 'vmess' | 'vless' | 'trojan' | 'socks' | 'openvpn' | 'slowdns' | 'udp-custom';

export interface Protocol {
  id: ProtocolType;
  name: string;
  description: string;
  icon: string;
  ports: PortConfig[];
  isEnabled: boolean;
}

export interface PortConfig {
  service: string;
  transport: string;
  tls: string;
  ntls: string;
}

export interface VPNAccount {
  id: string;
  protocol: ProtocolType;
  username: string;
  password: string;
  expiryDate: string;
  createdAt: string;
  createdBy: string;
  serverIp: string;
  domain: string;
  nsDomain: string;
  isActive: boolean;
  config: string;
}

export interface ServerConfig {
  ip: string;
  domain: string;
  nsDomain: string;
  slowdnsPub: string;
  openvpnDownload: string;
}

export interface DashboardStats {
  totalResellers: number;
  activeResellers: number;
  totalAccounts: number;
  activeAccounts: number;
  totalCreditsUsed: number;
  protocolsEnabled: number;
}
