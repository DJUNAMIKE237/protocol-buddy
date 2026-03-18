import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole, ProtocolQuota } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  addUser: (user: User) => void;
  removeUser: (id: string) => boolean;
  updateUser: (id: string, updates: Partial<User>) => void;
  toggleUserActive: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_USERS: User[] = [
  {
    id: 'super-admin-1', username: 'admin', password: 'admin123', role: 'super_admin',
    credits: 9999, maxCredits: 9999, expiryDate: '2099-12-31',
    createdAt: '2025-01-01', isActive: true,
  },
  {
    id: 'res-1', username: 'reseller', password: 'reseller123', role: 'reseller',
    credits: 45, maxCredits: 90, expiryDate: '2026-06-18',
    createdAt: '2026-01-15', isActive: true, createdBy: 'super-admin-1',
    bouquet: [
      { protocolId: 'ssh', maxAccounts: 50, usedAccounts: 12 },
      { protocolId: 'vmess', maxAccounts: 30, usedAccounts: 5 },
      { protocolId: 'vless', maxAccounts: 20, usedAccounts: 3 },
    ],
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);

  const login = useCallback((username: string, password: string): boolean => {
    const found = users.find(u => u.username === username && u.password === password && u.isActive);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => setUser(null), []);

  const addUser = useCallback((newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  }, []);

  const removeUser = useCallback((id: string): boolean => {
    const target = users.find(u => u.id === id);
    if (target?.role === 'super_admin') return false;
    setUsers(prev => prev.filter(u => u.id !== id));
    return true;
  }, [users]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    setUser(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, []);

  const toggleUserActive = useCallback((id: string) => {
    const target = users.find(u => u.id === id);
    if (target?.role === 'super_admin') return;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
  }, [users]);

  return (
    <AuthContext.Provider value={{ user, users, login, logout, isAuthenticated: !!user, addUser, removeUser, updateUser, toggleUserActive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
