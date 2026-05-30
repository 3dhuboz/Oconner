import { useClerk } from '@clerk/clerk-react';
import { clearStaffRescuePin } from '@butcher/shared';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

/**
 * Standard error banner for admin pages whose primary data fetch failed.
 *
 * Distinguishes expired-session errors from forbidden admin-link errors and
 * generic network/server errors. Replaces the silent `.catch(() => {})`
 * pattern that turned an expired Clerk token into empty dashboard data.
 *
 * Usage:
 *   const [error, setError] = useState<DataLoadErrorState | null>(null);
 *   try { ... } catch (e) { setError(toDataLoadError(e)); }
 *   return error ? <DataLoadError error={error} onRetry={load} /> : <YourPage />;
 */
export interface DataLoadErrorState {
  message: string;
  isAuth: boolean;
  isForbidden: boolean;
  supportId?: string;
  resetRecommended: boolean;
}

export function toDataLoadError(e: unknown, label = "Couldn't load this page"): DataLoadErrorState {
  const details = e as { message?: string; status?: number; supportId?: string; action?: string };
  const message = String(details?.message ?? label);
  const isAuth = details?.status === 401 || /unauth|401/i.test(message);
  const isForbidden = details?.status === 403 || /forbidden|403/i.test(message);
  return {
    message,
    isAuth,
    isForbidden,
    supportId: details?.supportId,
    resetRecommended: details?.action === 'reset_sign_in',
  };
}

export default function DataLoadError({
  error,
  onRetry,
  title,
}: {
  error: DataLoadErrorState;
  onRetry: () => void;
  title?: string;
}) {
  const { signOut } = useClerk();
  const handleSignOut = async () => {
    clearStaffRescuePin();
    try { await signOut(); } catch { /* best-effort */ }
    window.location.href = '/';
  };

  const needsAdminCheck = error.isForbidden;
  const isAuthLike = error.isAuth || needsAdminCheck;
  const heading = error.isAuth
    ? 'Your sign-in looks stale'
    : needsAdminCheck
      ? 'Admin access needs checking'
      : (title ?? "Couldn't load this page");
  const body = error.isAuth
    ? 'Sign out and sign back in to refresh - your data will reappear.'
    : needsAdminCheck
      ? "Your login worked, but the API couldn't match this browser session to an active admin account. Reset sign-in and log back in."
      : error.message;

  return (
    <div className={`mb-4 rounded-xl border p-4 flex items-start gap-3 ${isAuthLike ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {heading}
        </p>
        <p className="text-sm mt-0.5">
          {body}
        </p>
        {error.supportId && (
          <p className="text-xs mt-2 font-semibold">
            Support code: {error.supportId}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          {(isAuthLike || error.resetRecommended) && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700"
            >
              <LogOut className="h-3.5 w-3.5" /> Reset sign-in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
