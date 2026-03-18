import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getProtocols } from '@/lib/store';
import { User, ProtocolQuota } from '@/lib/types';
import { Plus, Trash2, UserCheck, UserX, Eye, EyeOff, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminResellers() {
  const { user: currentUser, users, addUser, removeUser, toggleUserActive } = useAuth();
  const resellers = users.filter(u => u.role === 'reseller');
  const protocols = getProtocols();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newDuration, setNewDuration] = useState('30');
  const [customDuration, setCustomDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProtocols, setSelectedProtocols] = useState<Record<string, boolean>>({});
  const [protocolLimits, setProtocolLimits] = useState<Record<string, number>>({});

  const toggleProtocol = (id: string) => setSelectedProtocols(prev => ({ ...prev, [id]: !prev[id] }));
  const setLimit = (id: string, limit: number) => setProtocolLimits(prev => ({ ...prev, [id]: limit }));

  const handleCreate = () => {
    if (!newName.trim() || !newPassword.trim()) return;
    // Check duplicate username
    if (users.some(u => u.username.toLowerCase() === newName.trim().toLowerCase())) {
      alert('Ce nom d\'utilisateur existe déjà');
      return;
    }
    const now = new Date();
    const days = useCustomDuration ? parseInt(customDuration) || 30 : parseInt(newDuration);
    const expiry = new Date(now.getTime() + days * 86400000);

    const bouquet: ProtocolQuota[] = protocols
      .filter(p => selectedProtocols[p.id])
      .map(p => ({ protocolId: p.id, maxAccounts: protocolLimits[p.id] || 10, usedAccounts: 0 }));

    const newReseller: User = {
      id: Date.now().toString(),
      username: newName.trim(),
      password: newPassword,
      role: 'reseller',
      credits: days,
      maxCredits: days,
      expiryDate: expiry.toISOString().split('T')[0],
      createdAt: now.toISOString().split('T')[0],
      createdBy: currentUser?.id,
      isActive: true,
      bouquet,
    };

    addUser(newReseller);
    setNewName('');
    setNewPassword('');
    setShowCreate(false);
    setSelectedProtocols({});
    setProtocolLimits({});
    setUseCustomDuration(false);
    setCustomDuration('');
  };

  const filtered = resellers.filter(r => {
    const matchSearch = r.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? r.isActive : !r.isActive);
    return matchSearch && matchStatus;
  });

  // Calculate remaining time for each reseller
  const getRemainingDays = (expiryDate: string) => {
    const diff = new Date(expiryDate).getTime() - Date.now();
    if (diff <= 0) return 'Expiré';
    const days = Math.ceil(diff / 86400000);
    return `${days}j restant${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            <span className="text-gradient-primary">Gestion Revendeurs</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{resellers.length} revendeurs enregistrés</p>
        </motion.div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Ajouter Revendeur
        </motion.button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-6">
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">Nouveau Revendeur</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Nom d'utilisateur</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} className="input-dark w-full font-mono" placeholder="reseller_name" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Mot de passe</label>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)} className="input-dark w-full font-mono pr-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Durée du compte</label>
                  {useCustomDuration ? (
                    <div className="flex gap-2">
                      <input type="number" value={customDuration} onChange={e => setCustomDuration(e.target.value)}
                        className="input-dark w-full font-mono" placeholder="Jours" min="1" />
                      <button onClick={() => setUseCustomDuration(false)} className="btn-ghost text-xs whitespace-nowrap">Standard</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select value={newDuration} onChange={e => setNewDuration(e.target.value)} className="input-dark w-full">
                        <option value="1">1 Jour</option><option value="7">7 Jours</option>
                        <option value="30">30 Jours</option><option value="60">60 Jours</option>
                        <option value="90">90 Jours</option><option value="180">180 Jours</option>
                        <option value="360">360 Jours</option>
                      </select>
                      <button onClick={() => setUseCustomDuration(true)} className="btn-ghost text-xs whitespace-nowrap">Custom</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="text-xs uppercase tracking-widest text-muted-foreground mb-3 block font-semibold">
                  🎯 Bouquet — Protocoles attribués
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {protocols.filter(p => p.isEnabled).map(proto => (
                    <div key={proto.id}
                      className={`rounded-xl border p-3 transition-all cursor-pointer ${
                        selectedProtocols[proto.id] ? 'border-primary/50 bg-primary/10' : 'border-border bg-card/30 hover:bg-secondary/20'
                      }`}
                      onClick={() => toggleProtocol(proto.id)}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{proto.icon}</span>
                        <span className="text-sm font-semibold text-foreground">{proto.name}</span>
                      </div>
                      {selectedProtocols[proto.id] && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={e => e.stopPropagation()}>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Max comptes</label>
                          <input type="number" value={protocolLimits[proto.id] || 10}
                            onChange={e => setLimit(proto.id, parseInt(e.target.value) || 0)}
                            className="input-dark w-full text-xs py-1.5 px-2" min="1" />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleCreate} className="btn-primary" disabled={!newName.trim() || !newPassword.trim()}>Créer le Revendeur</button>
                <button onClick={() => setShowCreate(false)} className="btn-ghost">Annuler</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-10" placeholder="Rechercher un revendeur..." />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input-dark w-40">
          <option value="all">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <span>Utilisateur</span><span>Statut</span><span>Durée</span><span>Bouquet</span>
          <span>Expiration</span><span>Créé le</span><span className="text-right">Actions</span>
        </div>
        <AnimatePresence>
          {filtered.map((reseller, i) => (
            <motion.div key={reseller.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-7 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center">
              <div>
                <p className="text-sm font-mono text-foreground font-semibold">{reseller.username}</p>
                <p className="text-xs text-muted-foreground">ID: {reseller.id.slice(0, 8)}</p>
              </div>
              <div>
                <span className={`protocol-badge ${reseller.isActive ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                  {reseller.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div>
                <p className="text-sm font-mono text-foreground">{getRemainingDays(reseller.expiryDate)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {reseller.bouquet?.slice(0, 3).map(b => (
                  <span key={b.protocolId} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {b.protocolId.toUpperCase()} ({b.usedAccounts}/{b.maxAccounts})
                  </span>
                ))}
                {(reseller.bouquet?.length || 0) > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{(reseller.bouquet?.length || 0) - 3}</span>
                )}
                {!reseller.bouquet?.length && <span className="text-xs text-muted-foreground">—</span>}
              </div>
              <p className="text-sm text-muted-foreground font-mono">{reseller.expiryDate}</p>
              <p className="text-sm text-muted-foreground font-mono">{reseller.createdAt}</p>
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => toggleUserActive(reseller.id)}
                  className={`p-2 rounded-lg transition-colors ${reseller.isActive ? 'hover:bg-warning/10 text-warning' : 'hover:bg-success/10 text-success'}`}>
                  {reseller.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>
                <button onClick={() => removeUser(reseller.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Aucun revendeur trouvé</div>
        )}
      </div>
    </div>
  );
}
