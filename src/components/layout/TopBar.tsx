import { usePeriodo } from '../../contexts/PeriodoContext';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { IndicadorOnline } from '../realtime/IndicadorOnline';
import { SeletorPeriodo } from '../SeletorPeriodo';

export function TopBar() {
  const { formatarPeriodo } = usePeriodo();
  const { perfil } = useAuth();

  return (
    <header className="no-print hidden md:flex items-center justify-between gap-4 px-8 h-16 border-b border-border bg-bg/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 text-xs font-mono-num text-text-3">
        <span>Período</span>
        <span>/</span>
        <span className="text-text-2">{formatarPeriodo()}</span>
      </div>

      <SeletorPeriodo />

      <div className="flex items-center gap-4">
        <IndicadorOnline />
        {perfil && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-2 hidden lg:inline">{perfil.nome}</span>
            <Avatar nome={perfil.nome} papel={perfil.papel} size={32} />
          </div>
        )}
      </div>
    </header>
  );
}
