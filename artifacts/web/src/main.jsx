import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
        <App />
);

// Register the offline-fallback service worker only in production builds.
// This has no effect during local development / normal `vite dev` browsing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: true });
      })
      .catch(() => {
        // Non-fatal: app continues to work normally without offline support.
      });
  });
}
