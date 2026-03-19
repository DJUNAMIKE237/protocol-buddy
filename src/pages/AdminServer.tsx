import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { ServerConfig } from '@/lib/types';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminServer() {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.getServerConfig().then(setConfig).catch(() => {}); }, []);
  const updateField = (field: string, value: string) => setConfig(prev => prev ? { ...prev, [field]: value } : prev);
  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try { await api.saveServerConfig(config); toast.success('Sauvegardé'); } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };
  if (!config) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Configuration Serveur</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Paramètres du serveur VPS — récupérés depuis le terminal</p>
      </motion.div>

      <div className="glass-card p-6 max-w-2xl">
        <div className="space-y-4">
          {[
            { key: 'ip', label: 'Adresse IP', placeholder: 'Sera détecté par install.sh' },
            { key: 'domain', label: 'Domaine Principal', placeholder: 'Configuré lors de l\'installation' },
            { key: 'nsDomain', label: 'NS Domain', placeholder: 'Configuré lors de l\'installation' },
            { key: 'slowdnsPub', label: 'SlowDNS Public Key', placeholder: 'Généré automatiquement' },
            { key: 'openvpnDownload', label: 'OpenVPN Download URL', placeholder: 'https://...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">{label}</label>
              <input value={(config as any)[key] || ''} onChange={e => updateField(key, e.target.value)}
                className="input-dark w-full font-mono" placeholder={placeholder} />
              {!(config as any)[key] && (
                <p className="text-xs text-warning mt-1">⚠ Non configuré — sera rempli par l'installation</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button onClick={handleSave} className="btn-primary">Sauvegarder</button>
          {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-success">✓ Sauvegardé</motion.span>}
        </div>
      </div>
    </div>
  );
}
