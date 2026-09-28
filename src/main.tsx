import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suprime erros e avisos relacionados ao WebSocket do Vite HMR que ocorrem no sandbox de desenvolvimento
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: any[]) => {
    const text = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ').toLowerCase();
    if (text.includes('websocket') || text.includes('[vite]') || text.includes('hmr') || text.includes('ws://') || text.includes('wss://')) {
      return;
    }
    originalError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    const text = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ').toLowerCase();
    if (text.includes('websocket') || text.includes('[vite]') || text.includes('hmr') || text.includes('ws://') || text.includes('wss://')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const msg = event.reason?.message || '';
      const str = event.reason?.toString?.() || '';
      const stack = event.reason?.stack || '';
      const fullText = (msg + ' ' + str + ' ' + stack).toLowerCase();
      if (fullText.includes('websocket') || fullText.includes('vite') || fullText.includes('hmr') || fullText.includes('ws://') || fullText.includes('wss://')) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {}
  });

  window.addEventListener('error', (event) => {
    try {
      const msg = event.message || '';
      const errorStr = event.error?.toString() || '';
      const fullText = (msg + ' ' + errorStr).toLowerCase();
      if (fullText.includes('websocket') || fullText.includes('vite') || fullText.includes('hmr') || fullText.includes('ws://') || fullText.includes('wss://')) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {}
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

