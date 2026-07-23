import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SQL_WASM_URL } from './lib/sqlite';
import './index.css';
import 'katex/dist/katex.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
      .then(async (registration) => {
        const sendWasmUrl = (worker: ServiceWorker | null) => {
          worker?.postMessage({ type: 'SQLITE_WASM_URL', url: SQL_WASM_URL });
        };
        sendWasmUrl(registration.installing);
        sendWasmUrl(registration.waiting);
        sendWasmUrl(registration.active);
        sendWasmUrl(navigator.serviceWorker.controller);
        const readyRegistration = await navigator.serviceWorker.ready;
        sendWasmUrl(readyRegistration.active);
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
  });
}
