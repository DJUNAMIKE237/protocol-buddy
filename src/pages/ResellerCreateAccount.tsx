import { useState } from 'react';
import { protocols, serverConfig } from '@/lib/mock-data';
import { ProtocolType } from '@/lib/types';
import { formatConfig } from '@/lib/config-formatter';
import ConfigOutput from '@/components/ConfigOutput';
import { Loader2 } from 'lucide-react';

export default function ResellerCreateAccount() {
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType>('ssh');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [duration, setDuration] = useState('1');
  const [loading, setLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState('');

  const handleGenerate = () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setGeneratedConfig('');

    setTimeout(() => {
      const now = new Date();
      const expiry = new Date(now.getTime() + parseInt(duration) * 86400000);
      const expiryStr = expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const config = formatConfig(
        { username, password, expiryDate: expiryStr, protocol: selectedProtocol },
        serverConfig,
      );
      setGeneratedConfig(config);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Créer un Compte VPN</h1>
        <p className="text-muted-foreground text-sm mt-1">Sélectionnez un protocole et générez les identifiants</p>
      </div>

      {/* Protocol Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {protocols.filter(p => p.isEnabled).map((proto) => (
          <button
            key={proto.id}
            onClick={() => setSelectedProtocol(proto.id)}
            className={`p-4 rounded-xl border transition-all text-left ${
              selectedProtocol === proto.id
                ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,200,255,0.15)]'
                : 'border-border bg-card/50 hover:border-border hover:bg-secondary/30'
            }`}
          >
            <span className="text-2xl block mb-2">{proto.icon}</span>
            <p className="text-sm font-bold text-foreground">{proto.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{proto.description}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Compte {protocols.find(p => p.id === selectedProtocol)?.name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Nom d'utilisateur</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="input-dark w-full font-mono" placeholder="username" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Mot de passe</label>
            <input value={password} onChange={e => setPassword(e.target.value)} className="input-dark w-full font-mono" placeholder="password" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Validité</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} className="input-dark w-full">
              <option value="1">1 Jour</option>
              <option value="7">7 Jours</option>
              <option value="30">30 Jours</option>
              <option value="60">60 Jours</option>
              <option value="90">90 Jours</option>
              <option value="180">180 Jours</option>
              <option value="360">360 Jours</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !username.trim() || !password.trim()}
          className="btn-primary w-full mt-6 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing on Server...
            </>
          ) : 'GÉNÉRER LES IDENTIFIANTS'}
        </button>
      </div>

      {/* Output */}
      {generatedConfig && <ConfigOutput config={generatedConfig} protocol={selectedProtocol} />}
    </div>
  );
}
