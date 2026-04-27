import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { PeriodoProvider } from './contexts/PeriodoContext';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

// Desregistra qualquer Service Worker antigo + limpa caches
// (resolve cache infinito do PWA antigo). Roda no início, antes da app montar.
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => {
        void reg.unregister();
      });
    });
  }
  if ('caches' in window) {
    void caches.keys().then((names) => {
      names.forEach((name) => {
        void caches.delete(name);
      });
    });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PeriodoProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </PeriodoProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
