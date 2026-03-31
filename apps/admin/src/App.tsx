import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import OrdersPage from './pages/Orders';
import OrderDetailPage from './pages/OrderDetail';
import ProductsPage from './pages/Products';
import DeliveryDaysPage from './pages/DeliveryDays';
import DeliveryManifestPage from './pages/DeliveryManifest';
import DriversPage from './pages/Drivers';
import SubscriptionsPage from './pages/Subscriptions';
import StockPage from './pages/Stock';
import CustomersPage from './pages/Customers';
import AuditLogPage from './pages/AuditLog';
import MapPage from './pages/Map';
import SettingsPage from './pages/Settings';
import SocialHubPage from './pages/SocialHub';
import StaffPage from './pages/Staff';
import ReportsPage from './pages/Reports';
import PromoCodesPage from './pages/PromoCodes';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAdmin><Layout /></RequireAdmin>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="delivery-days" element={<DeliveryDaysPage />} />
        <Route path="delivery-days/:dayId" element={<DeliveryManifestPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="social-hub" element={<SocialHubPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="promo-codes" element={<PromoCodesPage />} />
      </Route>
    </Routes>
  );
}
