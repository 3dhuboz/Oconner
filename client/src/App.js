import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientConfigProvider, useClientConfig } from './context/ClientConfigContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import Portfolio from './pages/Portfolio';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import AdminDashboard from './pages/AdminDashboard';
import AdminCustomers from './pages/AdminCustomers';
import AdminServices from './pages/AdminServices';
import AdminWorkflows from './pages/AdminWorkflows';
import AdminSiteGround from './pages/AdminSiteGround';
import Profile from './pages/Profile';
import SocialAI from './pages/SocialAI';
import AdminSocial from './pages/AdminSocial';
import SocialAIProduct from './pages/SocialAIProduct';
import AutoHue from './pages/AutoHue';
import Marketplace from './pages/Marketplace';
import MyApps from './pages/MyApps';
import AdminApps from './pages/AdminApps';
import FoodTrucProduct from './pages/FoodTrucProduct';
import AdminInvoices from './pages/AdminInvoices';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PennyAgent from './components/PennyAgent';
import WirezLauncher from './pages/WirezLauncher';
import SimpleWebsiteProduct from './pages/SimpleWebsiteProduct';
import AdminSettings from './pages/AdminSettings';
import AdminClientProjects from './pages/AdminClientProjects';
import AdminTemplates from './pages/AdminTemplates';
import Hosting from './pages/Hosting';
import FoodTruck from './pages/FoodTruck';
import SimpleWebsite from './pages/SimpleWebsite';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

const AppRoutes = () => {
  const { clientMode, enabledApps, loading: configLoading } = useClientConfig();

  if (configLoading) return <div className="loading-screen">Loading...</div>;

  // CLIENT MODE: Only show login, dashboard, and enabled apps
  if (clientMode) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Client dashboard & profile */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/my-apps" element={<ProtectedRoute><MyApps /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="/tickets/new" element={<ProtectedRoute><NewTicket /></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />

        {/* Only show app routes the client has access to */}
        {/* SocialAI standalone — only if NOT also paired with Food Truck or Simple Website (when paired, it's embedded as a tab) */}
        {(enabledApps.length === 0 || enabledApps.includes('socialai')) && !enabledApps.includes('foodtruck') && !enabledApps.includes('simplewebsite') && (
          <Route path="/social" element={<ProtectedRoute><SocialAI /></ProtectedRoute>} />
        )}
        {(enabledApps.length === 0 || enabledApps.includes('foodtruck')) && (
          <Route path="/foodtruck-app" element={<ProtectedRoute><FoodTruck /></ProtectedRoute>} />
        )}
        {(enabledApps.length === 0 || enabledApps.includes('simplewebsite')) && (
          <Route path="/simplewebsite-app" element={<ProtectedRoute><SimpleWebsite /></ProtectedRoute>} />
        )}
        {(enabledApps.length === 0 || enabledApps.includes('wirez')) && (
          <Route path="/wirez" element={<ProtectedRoute><WirezLauncher /></ProtectedRoute>} />
        )}

        {/* Client admin — limited to settings & social management */}
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/social" element={<ProtectedRoute adminOnly><AdminSocial /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />

        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    );
  }

  // NORMAL MODE: Full pennywiseit.com.au site
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/social-ai" element={<SocialAIProduct />} />
      <Route path="/autohue" element={<AutoHue />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/hosting" element={<Hosting />} />
      <Route path="/foodtruc" element={<FoodTrucProduct />} />
      <Route path="/simple-website" element={<SimpleWebsiteProduct />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Customer Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
      <Route path="/tickets/new" element={<ProtectedRoute><NewTicket /></ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/my-apps" element={<ProtectedRoute><MyApps /></ProtectedRoute>} />
      <Route path="/social" element={<ProtectedRoute><SocialAI /></ProtectedRoute>} />
      <Route path="/foodtruck-app" element={<ProtectedRoute><FoodTruck /></ProtectedRoute>} />
      <Route path="/simplewebsite-app" element={<ProtectedRoute><SimpleWebsite /></ProtectedRoute>} />
      <Route path="/wirez" element={<ProtectedRoute><WirezLauncher /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute adminOnly><AdminCustomers /></ProtectedRoute>} />
      <Route path="/admin/services" element={<ProtectedRoute adminOnly><AdminServices /></ProtectedRoute>} />
      <Route path="/admin/workflows" element={<ProtectedRoute adminOnly><AdminWorkflows /></ProtectedRoute>} />
      <Route path="/admin/siteground" element={<ProtectedRoute adminOnly><AdminSiteGround /></ProtectedRoute>} />
      <Route path="/admin/social" element={<ProtectedRoute adminOnly><AdminSocial /></ProtectedRoute>} />
      <Route path="/admin/apps" element={<ProtectedRoute adminOnly><AdminApps /></ProtectedRoute>} />
      <Route path="/admin/invoices" element={<ProtectedRoute adminOnly><AdminInvoices /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/projects" element={<ProtectedRoute adminOnly><AdminClientProjects /></ProtectedRoute>} />
      <Route path="/admin/templates" element={<ProtectedRoute adminOnly><AdminTemplates /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
    <ClientConfigProvider>
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
              <AppRoutes />
          </main>
          <Footer />
          <PennyAgent />
        </div>
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { background: '#1e293b', color: '#f8fafc', borderRadius: '8px' }
        }} />
      </Router>
    </AuthProvider>
    </ClientConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
