import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';
import { Trash2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ResellerAccounts() {
  const { accounts, refreshAll } = useAuth();
  const [copiedId, setCopiedId] = useState('');

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAccount(id);
      toast.success('Compte supprimé du serveur');
      await refreshAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCopy = (config: string, id: string) => {
    navigator.clipboard.writeText(config);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Mes Comptes</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{accounts.length} compte(s) créé(s)</p>
      </motion.div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <span>Protocole</span><span>Utilisateur</span><span>Statut</span>
          <span>Expiration</span><span>Créé le</span><span className="text-right">Actions</span>
        </div>
        <AnimatePresence>
          {accounts.map((acc, i) => (
            <motion.div key={acc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-6 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center">
              <span className="protocol-badge border-primary/30 text-primary bg-primary/10">{acc.protocol.toUpperCase()}</span>
              <p className="text-sm font-mono text-foreground">{acc.username}</p>
              <span className={`protocol-badge ${acc.isActive ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                {acc.isActive ? 'Actif' : 'Expiré'}
              </span>
              <p className="text-sm text-muted-foreground font-mono">{acc.expiryDate}</p>
              <p className="text-sm text-muted-foreground font-mono">{acc.createdAt}</p>
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => handleCopy(acc.config, acc.id)}
                  className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                  {copiedId === acc.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(acc.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {accounts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Aucun compte créé</div>
        )}
      </div>
    </div>
  );
}
