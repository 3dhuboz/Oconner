import { SignIn } from '@clerk/react';

export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/wirez-r-us-logo.png" alt="Wirez R Us" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Wirez R Us</h1>
          <p className="text-slate-400">Field Management System</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-slate-800 border border-slate-700 shadow-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-400',
              formFieldLabel: 'text-slate-300',
              formFieldInput: 'bg-slate-700 border-slate-600 text-white',
              formButtonPrimary: 'bg-amber-500 hover:bg-amber-600 text-black font-bold',
              footerActionLink: 'text-amber-400 hover:text-amber-300',
            },
          }}
          routing="path"
          path="/login"
          signUpUrl="/register"
          forceRedirectUrl="/"
        />
      </div>
    </div>
  );
}
