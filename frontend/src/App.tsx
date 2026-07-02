import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EquipmentsPage from './pages/EquipmentsPage';
import CategoriesPage from './pages/CategoriesPage';
import AlertsPage from './pages/AlertsPage';
import PredictionsPage from './pages/PredictionsPage';
import UsersPage from './pages/UsersPage';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'Administrateur' | 'Technicien' }> = ({ 
  children, 
  allowedRole 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-slate-400 text-sm font-semibold">Vérification de la session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    // If not allowed, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Layout for authenticated routes
const AuthenticatedLayout: React.FC = () => {
  return (
    <div className="flex bg-[#0b0f19] min-h-screen text-slate-100">
      <Sidebar />
      <main className="flex-1 w-full relative min-h-screen">
        <Routes>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="equipments" element={<EquipmentsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          
          {/* Admin only routes */}
          <Route 
            path="users" 
            element={
              <ProtectedRoute allowedRole="Administrateur">
                <UsersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="categories" 
            element={
              <ProtectedRoute allowedRole="Administrateur">
                <CategoriesPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect to dashboard */}
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } 
      />
      
      {/* Protected Routes Layout */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
