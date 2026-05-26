import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const productionPublishableKey = 'pk_live_Y2xlcmsub2Nvbm5vcmFncmljdWx0dXJlLmNvbS5hdSQ';
const envPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const publishableKey = import.meta.env.PROD ? productionPublishableKey : envPublishableKey;
if (!publishableKey) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set');
if (import.meta.env.PROD && !publishableKey.startsWith('pk_live_')) {
  throw new Error('Production driver app must use the live Clerk publishable key');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>,
);
