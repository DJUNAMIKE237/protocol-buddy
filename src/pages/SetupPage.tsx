import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as store from '@/lib/store';
import { User } from '@/lib/types';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export default function SetupPage() {
  const { refreshData } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Tous les champs sont requis');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    const superAdmin: User = {
      id: 'super-admin-' + Date.now(),
      username: username.trim(),
      password,
      role: 'super_admin',
      credits: 9999,
      maxCredits: 9999,
      expiryDate: '2099-12-31',
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true,
    };

    store.saveUsers([superAdmin]);
    localStorage.setItem('nexus_initialized', 'true');
    store.addActivity({ action: 'Super Admin créé (setup)', user: username.trim() });
    refreshData();
    // Force reload to go to login
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(270 100% 65%) 0%, transparent 70%)' }}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-primary" />

          <div className="flex flex-col items-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--gradient-primary)' }}>
              <span className="text-3xl font-display font-black text-primary-foreground">N</span>
            </motion.div>
            <h1 className="text-2xl font-display font-black text-gradient-primary tracking-wider">NEXUS PRO</h1>
            <p className="text-muted-foreground text-sm mt-1">Configuration Initiale</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6">
            <p className="text-xs text-primary">
              🔧 Aucun administrateur détecté. Créez le compte Super Admin pour commencer.
            </p>
          </div>

          <form onSubmit={handleSetup} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">
                Nom d'utilisateur Admin
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input-dark w-full font-mono" placeholder="admin" required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">
                Mot de passe
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} className="input-dark w-full font-mono pr-12"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">
                Confirmer le mot de passe
              </label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="input-dark w-full font-mono" placeholder="••••••••" required />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                {error}
              </motion.div>
            )}

            <button type="submit" className="btn-primary w-full text-base tracking-wider">
              CRÉER LE SUPER ADMIN
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Ce compte sera le <span className="text-primary font-semibold">Super Admin</span> — il ne pourra jamais être supprimé.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
