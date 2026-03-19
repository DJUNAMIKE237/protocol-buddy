import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';
import { Protocol } from '@/lib/types';
import { Activity, CreditCard, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResellerDashboard() {
  const { user, accounts } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);

  useEffect(() => {
    api.getProtocols().then(setProtocols).catch(() => {});
  }, []);

  const activeAccounts = accounts.filter(a => a.isActive).length;
  const totalQuota = user?.bouquet?.reduce((sum, b) => sum + b.maxAccounts, 0) || 0;
  const usedQuota = user?.bouquet?.reduce((sum, b) => sum + b.usedAccounts, 0) || 0;

  const getRemainingTime = () => {
    if (!user?.expiryDate) return { text: 'N/A', percent: 0 };
    const diff = new Date(user.expiryDate).getTime() - Date.now();
    if (diff <= 0) return { text: '⚠️ Expiré', percent: 0 };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const maxMs = (user.maxCredits || 30) * 86400000;
    const percent = Math.min(100, (diff / maxMs) * 100);
    return { text: `${days}j ${hours}h ${mins}m ${secs}s`, percent };
  };

  const [remaining, setRemaining] = useState(getRemainingTime());
  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemainingTime()), 1000);
    return () => clearInterval(timer);
  }, [user]);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Mon Panel</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenue, <span className="text-primary font-mono">{user?.username}</span>
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Temps Restant
          </h3>
          <span className="text-xs text-muted-foreground">Expire: {user?.expiryDate}</span>
        </div>
        <p className="text-2xl font-mono font-bold text-primary mb-3">{remaining.text}</p>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${remaining.percent}%`, background: 'var(--gradient-primary)' }} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Comptes Actifs</span>
            <Activity className="w-5 h-5 text-success" />
          </div>
          <p className="stat-value text-foreground">{activeAccounts}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Quota Utilisé</span>
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <p className="stat-value text-foreground">{usedQuota} / {totalQuota}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Protocoles</span>
            <span className="text-2xl">{user?.bouquet?.length || 0}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {user?.bouquet?.map(b => {
              const proto = protocols.find(p => p.id === b.protocolId);
              return (
                <span key={b.protocolId} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                  {proto?.icon} {proto?.name} ({b.usedAccounts}/{b.maxAccounts})
                </span>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
