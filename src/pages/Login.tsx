import { SignIn } from '@clerk/react';

export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-8">
          <img src="/logo.png" alt="Wirez R Us" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Wirez R Us</h1>
          <p className="text-slate-500">Field Management System</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              variables: {
                colorPrimary: '#d97706',
                colorBackground: '#ffffff',
                colorText: '#1e293b',
                colorTextSecondary: '#64748b',
                colorInputBackground: '#f8fafc',
                colorInputText: '#1e293b',
                borderRadius: '0.75rem',
              },
              elements: {
                rootBox: 'w-full',
                card: 'shadow-xl border border-slate-200',
                formButtonPrimary: 'bg-amber-600 hover:bg-amber-700 text-white font-bold',
                footerActionLink: 'text-amber-600 hover:text-amber-700',
              },
            }}
            routing="path"
            path="/login"
            signUpUrl="/purchase"
            forceRedirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
