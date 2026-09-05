import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  // During local AI Studio preview, we might not have the key yet.
  // We'll let the App render but show a warning, or just render it if they want to build the UI first.
  console.warn("Missing Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-center p-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Clerk Setup Required</h1>
          <p className="text-slate-600">Please add VITE_CLERK_PUBLISHABLE_KEY to your environment variables to enable multi-tenant authentication.</p>
        </div>
      </div>
    )}
  </StrictMode>,
);
