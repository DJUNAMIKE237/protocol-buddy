import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, VPNAccount } from '@/lib/types';
import * as api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  users: User[];
  accounts: VPNAccount[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isReady: boolean;
  hasAdminAccount: boolean;
  refreshUsers: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<VPNAccount[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [hasAdminAccount, setHasAdminAccount] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const hasA = await api.hasAdmin();
        setHasAdminAccount(hasA);

        if (api.isLoggedIn()) {
          try {
            const me = await api.getMe();
            setUser(me);
            // Load data based on role
            if (me.role === 'super_admin' || me.role === 'admin') {
              const [u, a] = await Promise.all([api.getUsers(), api.getAccounts()]);
              setUsers(u);
              setAccounts(a);
            } else {
              const a = await api.getAccounts();
              setAccounts(a);
            }
          } catch {
            api.logout();
          }
        }
      } catch {
        // API not available - probably not deployed yet
      }
      setIsReady(true);
    };
    init();
  }, []);

  // Periodic refresh every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const me = await api.getMe();
        setUser(me);
        if (me.role !== 'reseller') {
          const [u, a] = await Promise.all([api.getUsers(), api.getAccounts()]);
          setUsers(u);
          setAccounts(a);
        } else {
          setAccounts(await api.getAccounts());
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await api.login(username, password);
      setUser(data.user);
      setHasAdminAccount(true);
      if (data.user.role !== 'reseller') {
        const [u, a] = await Promise.all([api.getUsers(), api.getAccounts()]);
        setUsers(u);
        setAccounts(a);
      } else {
        setAccounts(await api.getAccounts());
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setUsers([]);
    setAccounts([]);
  }, []);

  const refreshUsers = useCallback(async () => {
    try { setUsers(await api.getUsers()); } catch {}
  }, []);

  const refreshAccounts = useCallback(async () => {
    try { setAccounts(await api.getAccounts()); } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      if (me.role !== 'reseller') {
        const [u, a] = await Promise.all([api.getUsers(), api.getAccounts()]);
        setUsers(u);
        setAccounts(a);
      } else {
        setAccounts(await api.getAccounts());
      }
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user, users, accounts, login, logout,
      isAuthenticated: !!user, isReady, hasAdminAccount,
      refreshUsers, refreshAccounts, refreshAll,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
