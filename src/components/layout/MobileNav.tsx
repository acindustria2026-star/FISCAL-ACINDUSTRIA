import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { SidebarContent } from './SidebarContent';

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className = '' }: MobileNavProps) {
  const [aberto, setAberto] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setAberto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  return (
    <div className={className}>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-surface border-b border-border">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-text-2 hover:text-text hover:bg-surface-2 transition"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-serif-display text-base">Controle Fiscal</span>
        </div>
        <span className="w-10" aria-hidden />
      </header>

      {aberto && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-surface border-r border-border shadow-xl animate-in">
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-lg text-text-2 hover:text-text hover:bg-surface-2 z-10"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setAberto(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
