import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/Login';
import StopsPage from './pages/Stops';
import StopDetailPage from './pages/StopDetail';
import ProfilePage from './pages/Profile';

function RequireDriver({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-full items-center justify-center bg-brand">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireDriver><StopsPage /></RequireDriver>} />
      <Route path="/stop/:stopId" element={<RequireDriver><StopDetailPage /></RequireDriver>} />
      <Route path="/profile" element={<RequireDriver><ProfilePage /></RequireDriver>} />
    </Routes>
  );
}
