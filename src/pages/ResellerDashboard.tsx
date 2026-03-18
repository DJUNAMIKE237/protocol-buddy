import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CreditCard, Zap, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResellerDashboard() {
  const { user, accounts } = useAuth();
  const [countdown, setCountdown] = useState('');

  const myAccounts = useMemo(() => 
    accounts.filter(a => a.createdBy === user?.id),
    [accounts, user?.id]
  );

  const bouquetCount = user?.bouquet?.length || 0;
  const totalUsed = user?.bouquet?.reduce((a, b) => a + b.usedAccounts, 0) || 0;
  const totalMax = user?.bouquet?.reduce((a, b) => a + b.maxAccounts, 0) || 0;
  const activeAccounts = myAccounts.filter(a => a.isActive).length;

  // Live countdown
  useEffect(() => {
    if (!user?.expiryDate) return;
    const update = () => {
      const diff = new Date(user.expiryDate).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('EXPIRÉ');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}j ${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [user?.expiryDate]);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Bienvenue, <span className="text-gradient-primary">{user?.username}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Votre espace revendeur</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Temps Restant', value: countdown, icon: Clock, sub: `Expire le ${user?.expiryDate}`, highlight: countdown === 'EXPIRÉ' },
          { label: 'Protocoles', value: bouquetCount, icon: Zap, sub: 'dans votre bouquet' },
          { label: 'Comptes Créés', value: `${totalUsed} / ${totalMax}`, icon: TrendingUp, sub: `${activeAccounts} actifs` },
          { label: 'Comptes Actifs', value: activeAccounts, icon: CreditCard, sub: `sur ${myAccounts.length} total` },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card-hover p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{stat.label}</span>
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <p className={`font-display font-bold text-foreground ${stat.label === 'Temps Restant' ? 'text-lg' : 'stat-value'} ${stat.highlight ? 'text-destructive' : ''}`}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Bouquet Details */}
      {user?.bouquet && user.bouquet.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">📦 Mon Bouquet</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {user.bouquet.map(b => (
              <div key={b.protocolId} className="rounded-xl border border-border p-4 bg-card/30 hover:border-primary/30 transition-all">
                <p className="text-sm font-display font-bold text-foreground uppercase">{b.protocolId}</p>
                <div className="mt-2">
                  <p className="text-2xl font-display font-bold text-primary">{b.usedAccounts}</p>
                  <p className="text-xs text-muted-foreground">/ {b.maxAccounts} comptes</p>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="h-1.5 rounded-full" style={{
                    background: 'var(--gradient-primary)',
                    width: `${(b.usedAccounts / b.maxAccounts) * 100}%`
                  }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Real accounts list */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Derniers Comptes Créés</h2>
        <div className="space-y-3">
          {myAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun compte créé pour le moment</p>
          )}
          {myAccounts.slice(0, 10).map(item => (
            <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gradient-primary)' }} />
                <span className="text-sm font-mono text-foreground">{item.username}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="protocol-badge border-primary/30 text-primary bg-primary/10">{item.protocol.toUpperCase()}</span>
                <span className={`protocol-badge ${item.isActive ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                  {item.isActive ? 'Actif' : 'Expiré'}
                </span>
                <span className="text-xs text-muted-foreground">{item.expiryDate}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
