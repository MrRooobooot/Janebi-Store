import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register Service Worker for PWA and Offline Support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration fallback
    });
  });
}

// Dev: drop any worker/caches left by an earlier production-style run on this origin,
// so localhost always renders the live source instead of a stale cached shell.
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (!regs.length) return;
    regs.forEach((r) => r.unregister());
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }).catch(() => {});
}
