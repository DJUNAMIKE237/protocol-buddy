import { useState } from 'react';

export default function ResellerAccounts() {
  const [accounts] = useState([
    { id: '1', username: 'client_ssh_01', protocol: 'SSH', expiry: '2026-03-25', status: 'Actif' },
    { id: '2', username: 'client_vmess_02', protocol: 'VMess', expiry: '2026-04-15', status: 'Actif' },
    { id: '3', username: 'client_trojan_01', protocol: 'Trojan', expiry: '2026-03-17', status: 'Expiré' },
    { id: '4', username: 'client_vless_01', protocol: 'VLESS', expiry: '2026-05-01', status: 'Actif' },
  ]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Mes Comptes Créés</h1>
        <p className="text-muted-foreground text-sm mt-1">{accounts.length} comptes au total</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <span>Utilisateur</span>
          <span>Protocole</span>
          <span>Expiration</span>
          <span>Statut</span>
          <span className="text-right">Actions</span>
        </div>
        {accounts.map((acc) => (
          <div key={acc.id} className="grid grid-cols-5 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors items-center">
            <span className="text-sm font-mono text-foreground">{acc.username}</span>
            <span className="protocol-badge border-primary/30 text-primary bg-primary/10 w-fit">{acc.protocol}</span>
            <span className="text-sm font-mono text-muted-foreground">{acc.expiry}</span>
            <span className={`protocol-badge w-fit ${acc.status === 'Actif' ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
              {acc.status}
            </span>
            <div className="text-right">
              <button className="btn-ghost text-xs">Voir Config</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
