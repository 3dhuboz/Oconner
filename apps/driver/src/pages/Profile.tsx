import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, LogOut, User, Truck } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-brand text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold">Profile</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-xl border p-6 flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mb-3">
            <Truck className="h-8 w-8 text-brand" />
          </div>
          <p className="font-semibold text-lg">{user?.fullName ?? user?.firstName ?? 'Driver'}</p>
          <p className="text-gray-500 text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>

        <div className="bg-white rounded-xl border divide-y">
          <div className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-medium"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </main>
    </div>
  );
}
