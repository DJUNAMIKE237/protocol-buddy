import { useAuth } from '@/lib/auth-context';
import { CreditCard, Zap, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResellerDashboard() {
  const { user } = useAuth();

  const bouquetCount = user?.bouquet?.length || 0;
  const totalUsed = user?.bouquet?.reduce((a, b) => a + b.usedAccounts, 0) || 0;
  const totalMax = user?.bouquet?.reduce((a, b) => a + b.maxAccounts, 0) || 0;

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
          { label: 'Crédits Restants', value: user?.credits || 0, icon: CreditCard, sub: `/ ${user?.maxCredits} jours`, showProgress: true },
          { label: 'Protocoles', value: bouquetCount, icon: Zap, sub: 'dans votre bouquet' },
          { label: 'Comptes Créés', value: totalUsed, icon: TrendingUp, sub: `/ ${totalMax} max` },
          { label: 'Expiration', value: user?.expiryDate || '-', icon: Clock, sub: 'date d\'expiration', small: true },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card-hover p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{stat.label}</span>
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <p className={`font-display font-bold text-foreground ${stat.small ? 'text-lg' : 'stat-value'}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            {stat.showProgress && (
              <div className="w-full bg-secondary rounded-full h-2 mt-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((user?.credits || 0) / (user?.maxCredits || 1)) * 100}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-2 rounded-full"
                  style={{ background: 'var(--gradient-primary)' }}
                />
              </div>
            )}
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Derniers Comptes Créés</h2>
        <div className="space-y-3">
          {[
            { user: 'client_ssh_01', protocol: 'SSH', date: 'Il y a 10 min', status: 'Actif' },
            { user: 'client_vmess_02', protocol: 'VMess', date: 'Il y a 1h', status: 'Actif' },
            { user: 'client_trojan_01', protocol: 'Trojan', date: 'Hier', status: 'Expiré' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gradient-primary)' }} />
                <span className="text-sm font-mono text-foreground">{item.user}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="protocol-badge border-primary/30 text-primary bg-primary/10">{item.protocol}</span>
                <span className={`protocol-badge ${item.status === 'Actif' ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                  {item.status}
                </span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
