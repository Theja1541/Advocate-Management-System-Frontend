import React, { useState } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/layout/ScrollToTop';
import GlobalLoader from './components/common/GlobalLoader';

import { Suspense } from 'react';

// Page components using lazy loading for route-based code splitting
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Cases = React.lazy(() => import('./pages/Cases'));
const CaseApproval = React.lazy(() => import('./pages/CaseApproval'));
const Hearings = React.lazy(() => import('./pages/Hearings'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Docs = React.lazy(() => import('./pages/Docs'));
const Refs = React.lazy(() => import('./pages/Refs'));
const Land = React.lazy(() => import('./pages/Land'));
const Opinions = React.lazy(() => import('./pages/Opinions'));
const Advs = React.lazy(() => import('./pages/Advs'));
const Clients = React.lazy(() => import('./pages/Clients'));
const Member = React.lazy(() => import('./pages/Member'));
const Daybook = React.lazy(() => import('./pages/Daybook'));
const Pay = React.lazy(() => import('./pages/Pay'));
const Alerts = React.lazy(() => import('./pages/Alerts'));
const Reports = React.lazy(() => import('./pages/Reports'));
const BareActs = React.lazy(() => import('./pages/BareActs'));
const Amend = React.lazy(() => import('./pages/Amend'));
const LegalTexts = React.lazy(() => import('./pages/LegalTexts'));
const Calculators = React.lazy(() => import('./pages/Calculators'));
const Roles = React.lazy(() => import('./pages/Roles'));
const MasterSettings = React.lazy(() => import('./pages/MasterSettings'));
const Tenants = React.lazy(() => import('./pages/Tenants'));
const TenantSettings = React.lazy(() => import('./pages/TenantSettings'));
const SubscriptionPlans = React.lazy(() => import('./pages/SubscriptionPlans'));

const ProtectedRoute = ({ element, moduleKey }) => {
  const { hasPermission } = useAuth();
  return hasPermission(moduleKey, 'V') ? element : <Navigate to="/" replace />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Close sidebar automatically on mobile navigation
  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768 && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<GlobalLoader forceShow={true} />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className={`wrap ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} closeMobileMenu={closeSidebarOnMobile} />
      <div 
        className="main-container" 
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}
        onClick={() => {
          if (window.innerWidth <= 768 && !isSidebarCollapsed) {
            setIsSidebarCollapsed(true);
          }
        }}
      >
        <GlobalLoader />
        <Header toggleSidebar={toggleSidebar} />
        <main id="main">
          <Suspense fallback={<GlobalLoader forceShow={true} />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cases" element={<ProtectedRoute element={<Cases />} moduleKey="cases" />} />
              <Route path="/approve" element={<ProtectedRoute element={<CaseApproval />} moduleKey="approve" />} />
              <Route path="/hearings" element={<ProtectedRoute element={<Hearings />} moduleKey="diary" />} />
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
              <Route path="/texts" element={<ProtectedRoute element={<LegalTexts />} moduleKey="legalTexts" />} />
              <Route path="/tools" element={<ProtectedRoute element={<Calculators />} moduleKey="tools" />} />
              <Route path="/roles" element={<ProtectedRoute element={<Roles />} moduleKey="roles" />} />
              <Route path="/tenants" element={<ProtectedRoute element={<Tenants />} moduleKey="tenants" />} />
              <Route path="/tenants/:id/roles" element={<ProtectedRoute element={<Roles />} moduleKey="tenants" />} />
              <Route path="/settings/tenant" element={<ProtectedRoute element={<TenantSettings />} moduleKey="tenantSettings" />} />
              <Route path="/settings/masters" element={<ProtectedRoute element={<MasterSettings />} moduleKey="masters" />} />
              <Route path="/settings/plans" element={<ProtectedRoute element={<SubscriptionPlans />} moduleKey="plans" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
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
