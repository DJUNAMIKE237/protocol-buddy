import { useAuth } from '@/lib/auth-context';
import { CreditCard, Zap, Clock } from 'lucide-react';

export default function ResellerDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Bienvenue, <span className="text-primary font-mono">{user?.username}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Votre espace revendeur</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Crédits Restants</span>
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <p className="stat-value text-primary">{user?.credits}</p>
          <p className="text-xs text-muted-foreground mt-1">/ {user?.maxCredits} jours</p>
          <div className="w-full bg-secondary rounded-full h-2 mt-3">
            <div className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((user?.credits || 0) / (user?.maxCredits || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Comptes Créés</span>
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <p className="stat-value text-foreground">12</p>
          <p className="text-xs text-muted-foreground mt-1">ce mois-ci</p>
        </div>

        <div className="glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Expiration</span>
            <Clock className="w-5 h-5 text-success" />
          </div>
          <p className="stat-value text-foreground font-mono text-xl">{user?.expiryDate}</p>
          <p className="text-xs text-muted-foreground mt-1">date d'expiration du compte</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Derniers Comptes Créés</h2>
        <div className="space-y-3">
          {[
            { user: 'client_ssh_01', protocol: 'SSH', date: 'Il y a 10 min', status: 'Actif' },
            { user: 'client_vmess_02', protocol: 'VMess', date: 'Il y a 1h', status: 'Actif' },
            { user: 'client_trojan_01', protocol: 'Trojan', date: 'Hier', status: 'Expiré' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
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
      </div>
    </div>
  );
}
