import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: 'admin123',
    user: {
      id: 'admin-1', username: 'admin', role: 'admin',
      credits: 9999, maxCredits: 9999, expiryDate: '2099-12-31',
      createdAt: '2025-01-01', isActive: true,
    },
  },
  reseller: {
    password: 'reseller123',
    user: {
      id: 'res-1', username: 'reseller_alpha', role: 'reseller',
      credits: 45, maxCredits: 90, expiryDate: '2026-06-18',
      createdAt: '2026-01-15', isActive: true,
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((username: string, password: string): boolean => {
    const entry = DEMO_USERS[username];
    if (entry && entry.password === password) {
      setUser(entry.user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
