import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Logo } from './ui/Logo';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'fiscal-install-dismissed-em';
const DIAS_PARA_REPERGUNTAR = 7;

function recentementeDispensado(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    const dias = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return dias < DIAS_PARA_REPERGUNTAR;
  } catch {
    return false;
  }
}

export function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (recentementeDispensado()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setMostrar(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const onInstalled = () => {
      setMostrar(false);
      setPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dispensar() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setMostrar(false);
  }

  async function instalar() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setMostrar(false);
      setPrompt(null);
    } else {
      dispensar();
    }
  }

  if (!mostrar || !prompt) return null;

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-surface border border-accent-soft-border rounded-xl shadow-2xl z-40 animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, var(--accent-soft-bg) 0%, var(--surface) 60%)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Logo size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text font-medium">Instalar Controle Fiscal</p>
            <p className="text-xs text-text-2 mt-0.5">
              Adicione à tela inicial pra abrir como app — mais rápido e sem barra do navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar"
            className="w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-lg text-text-3 hover:text-text hover:bg-surface-2 transition flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={dispensar}
            className="flex-1 inline-flex items-center justify-center h-10 rounded-lg text-sm text-text-2 hover:text-text hover:bg-surface-2 transition"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={instalar}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-accent text-[#0B0B0D] text-sm font-medium hover:brightness-110 transition"
          >
            <Download size={14} /> Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
