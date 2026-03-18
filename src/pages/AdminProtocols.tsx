import { useState } from 'react';
import { protocols } from '@/lib/mock-data';
import { Protocol } from '@/lib/types';

export default function AdminProtocols() {
  const [protos, setProtos] = useState<Protocol[]>(protocols);

  const toggleProtocol = (id: string) => {
    setProtos(protos.map(p => p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion des Protocoles</h1>
        <p className="text-muted-foreground text-sm mt-1">Configurer les protocoles et ports disponibles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {protos.map((proto) => (
          <div key={proto.id} className={`glass-card-hover p-6 ${!proto.isEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{proto.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{proto.name}</h3>
                  <p className="text-xs text-muted-foreground">{proto.description}</p>
                </div>
              </div>
              <button onClick={() => toggleProtocol(proto.id)}
                className={`relative w-12 h-6 rounded-full transition-colors ${proto.isEnabled ? 'bg-primary' : 'bg-secondary'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${proto.isEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Ports Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-2 p-2 bg-secondary/30 text-xs uppercase tracking-widest text-muted-foreground">
                <span>Service</span>
                <span>Transport</span>
                <span>TLS</span>
                <span>NTLS</span>
              </div>
              {proto.ports.map((port, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 p-2 border-t border-border text-sm">
                  <span className="text-foreground font-mono text-xs">{port.service}</span>
                  <span className="text-muted-foreground text-xs">{port.transport}</span>
                  <span className="text-primary font-mono text-xs">{port.tls}</span>
                  <span className="text-muted-foreground font-mono text-xs">{port.ntls}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
