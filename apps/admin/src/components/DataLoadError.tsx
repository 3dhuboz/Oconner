import { useClerk } from '@clerk/clerk-react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

/**
 * Standard error banner for admin pages whose primary data fetch failed.
 *
 * Distinguishes auth-flavoured errors (which the user can fix with sign out +
 * sign back in) from generic network/server errors (which the user retries).
 * Replaces the silent `.catch(() => {})` pattern that turned an expired Clerk
 * token into a dashboard full of zeros (per Seamus's report on the dashboard).
 *
 * Usage:
 *   const [error, setError] = useState<DataLoadErrorState | null>(null);
 *   try { ... } catch (e) { setError(toDataLoadError(e)); }
 *   return error ? <DataLoadError error={error} onRetry={load} /> : <YourPage />;
 */
export interface DataLoadErrorState {
  message: string;
  isAuth: boolean;
}

export function toDataLoadError(e: unknown, label = "Couldn't load this page"): DataLoadErrorState {
  const message = String((e as { message?: string })?.message ?? label);
  const isAuth = /unauth|forbidden|401|403/i.test(message);
  return { message, isAuth };
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
    try { await signOut(); } catch { /* best-effort */ }
    window.location.href = '/';
  };

  return (
    <div className={`mb-4 rounded-xl border p-4 flex items-start gap-3 ${error.isAuth ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {error.isAuth ? 'Your sign-in looks stale' : (title ?? "Couldn't load this page")}
        </p>
        <p className="text-sm mt-0.5">
          {error.isAuth
            ? 'Sign out and sign back in to refresh — your data will reappear.'
            : error.message}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          {error.isAuth && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
