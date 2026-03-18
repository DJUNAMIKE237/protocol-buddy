import { useState } from 'react';
import { serverConfig } from '@/lib/mock-data';

export default function AdminServer() {
  const [config, setConfig] = useState(serverConfig);

  const updateField = (field: string, value: string) => {
    setConfig({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuration Serveur</h1>
        <p className="text-muted-foreground text-sm mt-1">Paramètres du serveur VPS</p>
      </div>

      <div className="glass-card p-6 max-w-2xl">
        <div className="space-y-4">
          {[
            { key: 'ip', label: 'Adresse IP', placeholder: '45.41.206.33' },
            { key: 'domain', label: 'Domaine Principal', placeholder: 'joel.camtel.eu.cc' },
            { key: 'nsDomain', label: 'NS Domain', placeholder: 'blue.camtel.eu.cc' },
            { key: 'slowdnsPub', label: 'SlowDNS Public Key', placeholder: 'PUB Key' },
            { key: 'openvpnDownload', label: 'OpenVPN Download URL', placeholder: 'https://...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">{label}</label>
              <input
                value={(config as any)[key]}
                onChange={e => updateField(key, e.target.value)}
                className="input-dark w-full font-mono"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
        <button className="btn-primary mt-6">Sauvegarder</button>
      </div>
    </div>
  );
}
