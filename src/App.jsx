import React, { useState } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/layout/ScrollToTop';

// Page components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseApproval from './pages/CaseApproval';
import Diary from './pages/Diary';
import Tasks from './pages/Tasks';
import Docs from './pages/Docs';
import Refs from './pages/Refs';
import Land from './pages/Land';
import Opinions from './pages/Opinions';
import Advs from './pages/Advs';
import Clients from './pages/Clients';
import Member from './pages/Member';
import Daybook from './pages/Daybook';
import Pay from './pages/Pay';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import BareActs from './pages/BareActs';
import Amend from './pages/Amend';
import Calculators from './pages/Calculators';
import Roles from './pages/Roles';
import MasterSettings from './pages/MasterSettings';

const ProtectedRoute = ({ element, moduleKey }) => {
  const { hasPermission } = useAuth();
  return hasPermission(moduleKey, 'V') ? element : <Navigate to="/" replace />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className={`wrap ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className="main-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <Header toggleSidebar={toggleSidebar} />
        <main id="main" style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<ProtectedRoute element={<Cases />} moduleKey="cases" />} />
            <Route path="/approve" element={<ProtectedRoute element={<CaseApproval />} moduleKey="approve" />} />
            <Route path="/diary" element={<ProtectedRoute element={<Diary />} moduleKey="diary" />} />
            <Route path="/tasks" element={<ProtectedRoute element={<Tasks />} moduleKey="cases" />} />
            <Route path="/docs" element={<ProtectedRoute element={<Docs />} moduleKey="docs" />} />
            <Route path="/refs" element={<ProtectedRoute element={<Refs />} moduleKey="refs" />} />
            <Route path="/land" element={<ProtectedRoute element={<Land />} moduleKey="land" />} />
            <Route path="/opinions" element={<ProtectedRoute element={<Opinions />} moduleKey="opinions" />} />
            <Route path="/advs" element={<ProtectedRoute element={<Advs />} moduleKey="advs" />} />
            <Route path="/clients" element={<ProtectedRoute element={<Clients />} moduleKey="clients" />} />
            <Route path="/member" element={<ProtectedRoute element={<Member />} moduleKey="member" />} />
            <Route path="/daybook" element={<ProtectedRoute element={<Daybook />} moduleKey="daybook" />} />
            <Route path="/pay" element={<ProtectedRoute element={<Pay />} moduleKey="pay" />} />
            <Route path="/alerts" element={<ProtectedRoute element={<Alerts />} moduleKey="alerts" />} />
            <Route path="/reports" element={<ProtectedRoute element={<Reports />} moduleKey="reports" />} />
            <Route path="/acts" element={<ProtectedRoute element={<BareActs />} moduleKey="acts" />} />
            <Route path="/amend" element={<ProtectedRoute element={<Amend />} moduleKey="amend" />} />
            <Route path="/tools" element={<ProtectedRoute element={<Calculators />} moduleKey="tools" />} />
            <Route path="/roles" element={<ProtectedRoute element={<Roles />} moduleKey="roles" />} />
            <Route path="/settings/masters" element={<ProtectedRoute element={<MasterSettings />} moduleKey="roles" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
