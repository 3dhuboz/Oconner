import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Add VITE_CLERK_PUBLISHABLE_KEY to your .env.local');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInUrl="/login"
        signUpUrl="/purchase"
        afterSignOutUrl="/login"
      >
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
);
