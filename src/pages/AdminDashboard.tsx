import { mockStats } from '@/lib/mock-data';
import { Users, Zap, CreditCard, Activity } from 'lucide-react';

const stats = [
  { label: 'Total Revendeurs', value: mockStats.totalResellers, icon: Users, color: 'text-primary' },
  { label: 'Revendeurs Actifs', value: mockStats.activeResellers, icon: Activity, color: 'text-success' },
  { label: 'Comptes Créés', value: mockStats.totalAccounts, icon: CreditCard, color: 'text-warning' },
  { label: 'Protocoles Actifs', value: mockStats.protocolsEnabled, icon: Zap, color: 'text-primary' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre infrastructure</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card-hover p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="stat-value text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activité Récente</h2>
        <div className="space-y-3">
          {[
            { action: 'Compte SSH créé', user: 'reseller_alpha', time: 'Il y a 5 min', protocol: 'SSH' },
            { action: 'Nouveau revendeur', user: 'reseller_delta', time: 'Il y a 30 min', protocol: '-' },
            { action: 'Compte VMess créé', user: 'reseller_beta', time: 'Il y a 1h', protocol: 'VMess' },
            { action: 'Revendeur supprimé', user: 'reseller_gamma', time: 'Il y a 2h', protocol: '-' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                <div>
                  <p className="text-sm text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.user}</p>
                </div>
              </div>
              <div className="text-right">
                {item.protocol !== '-' && (
                  <span className="protocol-badge border-primary/30 text-primary bg-primary/10 mr-2">
                    {item.protocol}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
