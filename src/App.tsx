import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";
import DashboardLayout from "./components/DashboardLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminResellers from "./pages/AdminResellers";
import AdminAdmins from "./pages/AdminAdmins";
import AdminProtocols from "./pages/AdminProtocols";
import AdminServer from "./pages/AdminServer";
import AdminAppearance from "./pages/AdminAppearance";
import AdminSettings from "./pages/AdminSettings";
import ResellerDashboard from "./pages/ResellerDashboard";
import ResellerCreateAccount from "./pages/ResellerCreateAccount";
import ResellerAccounts from "./pages/ResellerAccounts";
import NotFound from "./pages/NotFound";
import { hasAdmin } from "@/lib/store";

const queryClient = new QueryClient();

// Route guard component
function RequireRole({ allowed, children }: { allowed: ('super_admin' | 'admin' | 'reseller')[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    const redirect = user?.role === 'reseller' ? '/reseller' : '/admin';
    return <Navigate to={redirect} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // If no admin exists and no nexus-config.json was loaded, show setup
  if (!hasAdmin() && !isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<SetupPage />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAdmin ? '/admin' : '/reseller'} replace />} />
      <Route element={<DashboardLayout />}>
        {/* Admin routes - protected */}
        <Route path="/admin" element={<RequireRole allowed={['super_admin', 'admin']}><AdminDashboard /></RequireRole>} />
        <Route path="/admin/resellers" element={<RequireRole allowed={['super_admin', 'admin']}><AdminResellers /></RequireRole>} />
        <Route path="/admin/admins" element={<RequireRole allowed={['super_admin', 'admin']}><AdminAdmins /></RequireRole>} />
        <Route path="/admin/protocols" element={<RequireRole allowed={['super_admin', 'admin']}><AdminProtocols /></RequireRole>} />
        <Route path="/admin/server" element={<RequireRole allowed={['super_admin']}><AdminServer /></RequireRole>} />
        <Route path="/admin/appearance" element={<RequireRole allowed={['super_admin', 'admin']}><AdminAppearance /></RequireRole>} />
        <Route path="/admin/settings" element={<RequireRole allowed={['super_admin']}><AdminSettings /></RequireRole>} />
        {/* Reseller routes - protected */}
        <Route path="/reseller" element={<RequireRole allowed={['reseller']}><ResellerDashboard /></RequireRole>} />
        <Route path="/reseller/create" element={<RequireRole allowed={['reseller']}><ResellerCreateAccount /></RequireRole>} />
        <Route path="/reseller/accounts" element={<RequireRole allowed={['reseller']}><ResellerAccounts /></RequireRole>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
