import { useAuth } from '@/lib/auth-context';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, Shield, LogOut,
  Zap, Server, CreditCard
} from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/resellers', icon: Users, label: 'Revendeurs' },
  { to: '/admin/protocols', icon: Zap, label: 'Protocoles' },
  { to: '/admin/server', icon: Server, label: 'Serveur' },
];

const resellerLinks = [
  { to: '/reseller', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reseller/create', icon: Zap, label: 'Créer un Compte' },
  { to: '/reseller/accounts', icon: CreditCard, label: 'Mes Comptes' },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = user?.role === 'admin' ? adminLinks : resellerLinks;

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">DOTYCAT</h2>
            <p className="text-xs text-muted-foreground">Panel v1.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 px-4">
          {user?.role === 'admin' ? 'Administration' : 'Revendeur'}
        </p>
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} className={isActive ? 'sidebar-link-active' : 'sidebar-link'}>
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3 px-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary font-mono">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={logout} className="sidebar-link w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
