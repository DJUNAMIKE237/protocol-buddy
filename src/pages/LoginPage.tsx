import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await login(username, password);
    if (!success) setError('Identifiants invalides');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gradient-primary">Nexus Pro</h1>
          <p className="text-muted-foreground text-sm mt-1">Connectez-vous à votre panel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Nom d'utilisateur</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="input-dark w-full font-mono" placeholder="username" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-dark w-full font-mono" placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
