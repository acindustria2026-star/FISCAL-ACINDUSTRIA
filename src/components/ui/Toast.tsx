import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

const kindStyle: Record<ToastKind, { bg: string; border: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-accent-soft-bg',
    border: 'border-accent-soft-border',
    icon: <CheckCircle2 size={18} className="text-accent" />,
  },
  error: {
    bg: 'bg-warn-soft-bg',
    border: 'border-warn-soft-border',
    icon: <AlertCircle size={18} className="text-warn" />,
  },
  info: {
    bg: 'bg-surface-2',
    border: 'border-border',
    icon: <Info size={18} className="text-text-2" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++counterRef.current;
      setItems((curr) => [...curr, { id, kind, message }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
        {items.map((t) => {
          const style = kindStyle[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-3 p-3 pr-2 rounded-xl border shadow-lg ${style.bg} ${style.border}`}
            >
              <span className="mt-0.5">{style.icon}</span>
              <p className="text-sm text-text flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-text-3 hover:text-text transition"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider');
  return ctx;
}
