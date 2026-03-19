import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { Protocol } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AdminProtocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  useEffect(() => { api.getProtocols().then(setProtocols).catch(() => {}); }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.toggleProtocol(id, !enabled);
      setProtocols(prev => prev.map(p => p.id === id ? { ...p, isEnabled: !enabled } : p));
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Protocoles VPN</span>
        </h1>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {protocols.map((proto, i) => (
          <motion.div key={proto.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }} className={`glass-card-hover p-6 ${!proto.isEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{proto.icon}</span>
                <div>
                  <h3 className="text-lg font-display font-bold text-foreground">{proto.name}</h3>
                  <p className="text-xs text-muted-foreground">{proto.description}</p>
                </div>
              </div>
              <button onClick={() => handleToggle(proto.id, proto.isEnabled)}
                className={`relative w-12 h-6 rounded-full transition-all ${proto.isEnabled ? 'bg-gradient-primary' : 'bg-secondary'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${proto.isEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-2 p-2 bg-secondary/30 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                <span>Service</span><span>Transport</span><span>TLS</span><span>NTLS</span>
              </div>
              {proto.ports.map((port, j) => (
                <div key={j} className="grid grid-cols-4 gap-2 p-2 border-t border-border text-sm">
                  <span className="text-foreground font-mono text-xs">{port.service}</span>
                  <span className="text-muted-foreground text-xs">{port.transport}</span>
                  <span className="text-primary font-mono text-xs">{port.tls}</span>
                  <span className="text-muted-foreground font-mono text-xs">{port.ntls}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
