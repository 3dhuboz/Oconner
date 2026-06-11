import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

const productionPublishableKey = 'pk_live_Y2xlcmsub2Nvbm5vcmFncmljdWx0dXJlLmNvbS5hdSQ';
const publishableKey = productionPublishableKey;
if (!publishableKey) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set');
if (import.meta.env.PROD && !publishableKey.startsWith('pk_live_')) {
  throw new Error('Production driver app must use the live Clerk publishable key');
}

const updateServiceWorker = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => {
      registration.update().catch(() => {});
    };

    // Field drivers need deployed fixes to activate after a normal refresh.
    checkForUpdate();
    const interval = window.setInterval(checkForUpdate, 60_000);
    window.addEventListener('beforeunload', () => window.clearInterval(interval));
  },
  onNeedRefresh() {
    updateServiceWorker(true);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>,
);
