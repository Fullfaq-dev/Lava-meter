import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import AppLayout from './components/layout/AppLayout';
import Vedomost from './pages/Vedomost';
import DataInput from './pages/DataInput';
import Analytics from './pages/Analytics';
import ProductionInput from './pages/ProductionInput';
import EnergyReportInput from './pages/EnergyReportInput';
import Login from './pages/Login';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredAccess }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredAccess && user && !user[requiredAccess]) {
    // Find the first available page for the user
    if (user.access_vedomost) return <Navigate to="/" replace />;
    if (user.access_input) return <Navigate to="/input" replace />;
    if (user.access_analytics) return <Navigate to="/analytics" replace />;
    if (user.access_production) return <Navigate to="/production" replace />;
    if (user.access_energy_report) return <Navigate to="/energy-report" replace />;
    return <div>У вас нет доступа ни к одной странице.</div>;
  }

  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<ProtectedRoute requiredAccess="access_vedomost"><Vedomost /></ProtectedRoute>} />
        <Route path="/input" element={<ProtectedRoute requiredAccess="access_input"><DataInput /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute requiredAccess="access_analytics"><Analytics /></ProtectedRoute>} />
        <Route path="/production" element={<ProtectedRoute requiredAccess="access_production"><ProductionInput /></ProtectedRoute>} />
        <Route path="/energy-report" element={<ProtectedRoute requiredAccess="access_energy_report"><EnergyReportInput /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App