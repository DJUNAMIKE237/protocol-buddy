import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResellerAccounts() {
  const { user, accounts, removeAccount } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const myAccounts = useMemo(() =>
    accounts.filter(a => a.createdBy === user?.id),
    [accounts, user?.id]
  );

  const filtered = myAccounts.filter(a =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.protocol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Mes Comptes Créés</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{myAccounts.length} comptes au total</p>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="input-dark w-full pl-10" placeholder="Rechercher..." />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <span>Utilisateur</span><span>Protocole</span><span>Créé le</span><span>Expiration</span>
          <span>Statut</span><span className="text-right">Actions</span>
        </div>
        {filtered.map((acc, i) => {
          const isExpired = new Date(acc.expiryDate) <= new Date();
          const status = isExpired ? 'Expiré' : acc.isActive ? 'Actif' : 'Inactif';
          return (
            <motion.div key={acc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-6 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center">
              <span className="text-sm font-mono text-foreground font-semibold">{acc.username}</span>
              <span className="protocol-badge border-primary/30 text-primary bg-primary/10 w-fit">{acc.protocol.toUpperCase()}</span>
              <span className="text-sm font-mono text-muted-foreground">{acc.createdAt}</span>
              <span className="text-sm font-mono text-muted-foreground">{acc.expiryDate}</span>
              <span className={`protocol-badge w-fit ${status === 'Actif' ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                {status}
              </span>
              <div className="text-right">
                <button onClick={() => removeAccount(acc.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Aucun compte trouvé</div>
        )}
      </div>
    </div>
  );
}
