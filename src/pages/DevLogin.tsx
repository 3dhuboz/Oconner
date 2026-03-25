import { SignIn } from '@clerk/react';
import { Shield } from 'lucide-react';

export function DevLogin() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Developer Access</h1>
          <p className="text-slate-400/80 font-medium">Super Admin Login</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-slate-800 border border-slate-700 shadow-xl font-mono',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-400',
              formFieldLabel: 'text-slate-400',
              formFieldInput: 'bg-slate-900 border-slate-600 text-white font-mono',
              formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold',
              footerActionLink: 'text-emerald-400 hover:text-emerald-300',
            },
          }}
          routing="path"
          path="/dev/login"
          signUpUrl="/register"
          forceRedirectUrl="/admin"
        />
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Restricted Access. All attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
