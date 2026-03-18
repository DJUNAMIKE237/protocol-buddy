import { useState } from 'react';
import { mockResellers } from '@/lib/mock-data';
import { User } from '@/lib/types';
import { Plus, Trash2, UserCheck, UserX } from 'lucide-react';

export default function AdminResellers() {
  const [resellers, setResellers] = useState<User[]>(mockResellers);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCredits, setNewCredits] = useState('30');
  const [newDuration, setNewDuration] = useState('30');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const now = new Date();
    const expiry = new Date(now.getTime() + parseInt(newDuration) * 86400000);
    const newReseller: User = {
      id: Date.now().toString(),
      username: newName,
      role: 'reseller',
      credits: parseInt(newCredits),
      maxCredits: parseInt(newCredits),
      expiryDate: expiry.toISOString().split('T')[0],
      createdAt: now.toISOString().split('T')[0],
      isActive: true,
    };
    setResellers([...resellers, newReseller]);
    setNewName('');
    setShowCreate(false);
  };

  const handleDelete = (id: string) => {
    setResellers(resellers.filter(r => r.id !== id));
  };

  const toggleActive = (id: string) => {
    setResellers(resellers.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion Revendeurs</h1>
          <p className="text-muted-foreground text-sm mt-1">{resellers.length} revendeurs enregistrés</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter Revendeur
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card p-6 animate-slide-in">
          <h3 className="text-lg font-semibold text-foreground mb-4">Nouveau Revendeur</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Nom d'utilisateur</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="input-dark w-full font-mono" placeholder="reseller_name" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Crédits (jours)</label>
              <select value={newCredits} onChange={e => setNewCredits(e.target.value)} className="input-dark w-full">
                <option value="1">1 Jour</option>
                <option value="7">7 Jours</option>
                <option value="30">30 Jours</option>
                <option value="60">60 Jours</option>
                <option value="90">90 Jours</option>
                <option value="180">180 Jours</option>
                <option value="360">360 Jours</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Durée du compte</label>
              <select value={newDuration} onChange={e => setNewDuration(e.target.value)} className="input-dark w-full">
                <option value="1">1 Jour</option>
                <option value="30">30 Jours</option>
                <option value="60">60 Jours</option>
                <option value="90">90 Jours</option>
                <option value="180">180 Jours</option>
                <option value="360">360 Jours</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="btn-primary">Créer le Revendeur</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Annuler</button>
          </div>
        </div>
      )}

      {/* Resellers Table */}
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <span>Utilisateur</span>
          <span>Statut</span>
          <span>Crédits</span>
          <span>Expiration</span>
          <span>Créé le</span>
          <span className="text-right">Actions</span>
        </div>
        {resellers.map((reseller) => (
          <div key={reseller.id} className="grid grid-cols-6 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors items-center">
            <div>
              <p className="text-sm font-mono text-foreground">{reseller.username}</p>
              <p className="text-xs text-muted-foreground">ID: {reseller.id}</p>
            </div>
            <div>
              <span className={`protocol-badge ${reseller.isActive ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                {reseller.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div>
              <p className="text-primary font-bold font-mono">{reseller.credits}</p>
              <p className="text-xs text-muted-foreground">/ {reseller.maxCredits} jours</p>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{reseller.expiryDate}</p>
            <p className="text-sm text-muted-foreground font-mono">{reseller.createdAt}</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => toggleActive(reseller.id)}
                className={`p-2 rounded-lg transition-colors ${reseller.isActive ? 'hover:bg-warning/10 text-warning' : 'hover:bg-success/10 text-success'}`}
                title={reseller.isActive ? 'Désactiver' : 'Activer'}>
                {reseller.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(reseller.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {resellers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Aucun revendeur enregistré</div>
        )}
      </div>
    </div>
  );
}
