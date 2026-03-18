import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, ProtocolQuota, VPNAccount } from '@/lib/types';
import * as store from '@/lib/store';

interface AuthContextType {
  user: User | null;
  users: User[];
  accounts: VPNAccount[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isReady: boolean;
  addUser: (user: User) => void;
  removeUser: (id: string) => boolean;
  updateUser: (id: string, updates: Partial<User>) => void;
  toggleUserActive: (id: string) => void;
  addAccount: (account: VPNAccount) => void;
  removeAccount: (id: string) => void;
  refreshData: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<VPNAccount[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize: try loading from server config, then localStorage
  useEffect(() => {
    const init = async () => {
      await store.initializeFromServer();
      store.checkExpirations();
      setUsers(store.getUsers());
      setAccounts(store.getAccounts());
      setIsReady(true);
    };
    init();
  }, []);

  // Periodic expiration check every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      store.checkExpirations();
      setUsers(store.getUsers());
      setAccounts(store.getAccounts());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = useCallback(() => {
    setUsers(store.getUsers());
    setAccounts(store.getAccounts());
    // Also refresh current user if logged in
    setUser(prev => {
      if (!prev) return null;
      const updated = store.getUsers().find(u => u.id === prev.id);
      return updated && updated.isActive ? updated : null;
    });
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const allUsers = store.getUsers();
    const found = allUsers.find(u => u.username === username && u.password === password && u.isActive);
    if (found) {
      setUser(found);
      setUsers(allUsers);
      setAccounts(store.getAccounts());
      store.addActivity({ action: 'Connexion', user: username });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    if (user) store.addActivity({ action: 'Déconnexion', user: user.username });
    setUser(null);
  }, [user]);

  const addUser = useCallback((newUser: User) => {
    store.addUser(newUser);
    store.addActivity({
      action: newUser.role === 'reseller' ? 'Revendeur créé' : 'Admin créé',
      user: user?.username || 'system',
      target: newUser.username,
    });
    refreshData();
  }, [user, refreshData]);

  const removeUser = useCallback((id: string): boolean => {
    const target = store.getUsers().find(u => u.id === id);
    if (!target) return false;
    const result = store.removeUser(id);
    if (result) {
      store.addActivity({
        action: target.role === 'reseller' ? 'Revendeur supprimé' : 'Admin supprimé',
        user: user?.username || 'system',
        target: target.username,
      });
      refreshData();
    }
    return result;
  }, [user, refreshData]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    store.updateUser(id, updates);
    refreshData();
  }, [refreshData]);

  const toggleUserActive = useCallback((id: string) => {
    store.toggleUserActive(id);
    const target = store.getUsers().find(u => u.id === id);
    if (target) {
      store.addActivity({
        action: target.isActive ? 'Compte activé' : 'Compte désactivé',
        user: user?.username || 'system',
        target: target.username,
      });
    }
    refreshData();
  }, [user, refreshData]);

  const addAccount = useCallback((account: VPNAccount) => {
    store.addAccount(account);
    store.addActivity({
      action: `Compte ${account.protocol.toUpperCase()} créé`,
      user: user?.username || 'system',
      target: account.username,
      protocol: account.protocol,
    });
    // Update bouquet usage for the reseller
    if (user?.role === 'reseller' && user.bouquet) {
      const updatedBouquet = user.bouquet.map(b =>
        b.protocolId === account.protocol
          ? { ...b, usedAccounts: b.usedAccounts + 1 }
          : b
      );
      store.updateUser(user.id, { bouquet: updatedBouquet });
    }
    refreshData();
  }, [user, refreshData]);

  const removeAccount = useCallback((id: string) => {
    const acc = store.getAccounts().find(a => a.id === id);
    store.removeAccount(id);
    if (acc && user?.role === 'reseller' && user.bouquet) {
      const updatedBouquet = user.bouquet.map(b =>
        b.protocolId === acc.protocol
          ? { ...b, usedAccounts: Math.max(0, b.usedAccounts - 1) }
          : b
      );
      store.updateUser(user.id, { bouquet: updatedBouquet });
    }
    if (acc) {
      store.addActivity({
        action: `Compte ${acc.protocol.toUpperCase()} supprimé`,
        user: user?.username || 'system',
        target: acc.username,
        protocol: acc.protocol,
      });
    }
    refreshData();
  }, [user, refreshData]);

  return (
    <AuthContext.Provider value={{
      user, users, accounts, login, logout,
      isAuthenticated: !!user, isReady,
      addUser, removeUser, updateUser, toggleUserActive,
      addAccount, removeAccount, refreshData,
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
