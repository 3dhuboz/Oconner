import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useInstallPrompt } from './hooks/useInstallPrompt';
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

function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <div className="min-w-0">
        <p className="font-bold text-sm leading-tight">Install Driver App</p>
        <p className="text-xs text-white/75 mt-0.5">Add to home screen for the best experience</p>
      </div>
      <button
        onClick={install}
        className="flex-shrink-0 bg-white text-brand font-bold text-sm px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
      >
        Install
      </button>
    </div>
  );
}

export default function App() {
  return (
    <>
    <InstallBanner />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireDriver><StopsPage /></RequireDriver>} />
      <Route path="/run/:dayId" element={<RequireDriver><StopsPage /></RequireDriver>} />
      <Route path="/stop/:stopId" element={<RequireDriver><StopDetailPage /></RequireDriver>} />
      <Route path="/profile" element={<RequireDriver><ProfilePage /></RequireDriver>} />
    </Routes>
    </>
  );
}
