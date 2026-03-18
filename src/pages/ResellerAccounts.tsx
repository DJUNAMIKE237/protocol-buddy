import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResellerAccounts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts] = useState([
    { id: '1', username: 'client_ssh_01', protocol: 'SSH', expiry: '2026-03-25', status: 'Actif' },
    { id: '2', username: 'client_vmess_02', protocol: 'VMess', expiry: '2026-04-15', status: 'Actif' },
    { id: '3', username: 'client_trojan_01', protocol: 'Trojan', expiry: '2026-03-17', status: 'Expiré' },
    { id: '4', username: 'client_vless_01', protocol: 'VLESS', expiry: '2026-05-01', status: 'Actif' },
  ]);

  const filtered = accounts.filter(a => a.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Mes Comptes Créés</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{accounts.length} comptes au total</p>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="input-dark w-full pl-10" placeholder="Rechercher..." />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <span>Utilisateur</span>
          <span>Protocole</span>
          <span>Expiration</span>
          <span>Statut</span>
          <span className="text-right">Actions</span>
        </div>
        {filtered.map((acc, i) => (
          <motion.div
            key={acc.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-5 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center"
          >
            <span className="text-sm font-mono text-foreground font-semibold">{acc.username}</span>
            <span className="protocol-badge border-primary/30 text-primary bg-primary/10 w-fit">{acc.protocol}</span>
            <span className="text-sm font-mono text-muted-foreground">{acc.expiry}</span>
            <span className={`protocol-badge w-fit ${acc.status === 'Actif' ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
              {acc.status}
            </span>
            <div className="text-right">
              <button className="btn-ghost text-xs">Voir Config</button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Aucun compte trouvé</div>
        )}
      </div>
    </div>
  );
}
