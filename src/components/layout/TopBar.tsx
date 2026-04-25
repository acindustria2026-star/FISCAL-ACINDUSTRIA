import { useMemo } from 'react';
import { MESES_ABREV, usePeriodo, type PeriodoState } from '../../contexts/PeriodoContext';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { IndicadorOnline } from '../realtime/IndicadorOnline';

interface PillSpec {
  key: string;
  label: string;
  state: PeriodoState;
}

function montarPills(): PillSpec[] {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const pills: PillSpec[] = [
    { key: 'todos', label: 'Todos', state: { mes: null, ano: null } },
    { key: 'ano', label: String(anoAtual), state: { mes: null, ano: anoAtual } },
  ];

  const mesesParaMostrar = Math.min(3, mesAtual + 1);
  for (let offset = 0; offset < mesesParaMostrar; offset++) {
    const m = mesAtual - offset;
    pills.push({
      key: `m-${m}`,
      label: MESES_ABREV[m],
      state: { mes: m, ano: anoAtual },
    });
  }

  return pills;
}

function isAtivo(atual: { mes: number | null; ano: number | null }, alvo: PeriodoState): boolean {
  return atual.mes === alvo.mes && atual.ano === alvo.ano;
}

export function TopBar() {
  const { mes, ano, setPeriodo, formatarPeriodo } = usePeriodo();
  const { perfil } = useAuth();
  const pills = useMemo(montarPills, []);

  return (
    <header className="hidden md:flex items-center justify-between gap-4 px-8 h-16 border-b border-border bg-bg/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 text-xs font-mono-num text-text-3">
        <span>Período</span>
        <span>/</span>
        <span className="text-text-2">{formatarPeriodo()}</span>
      </div>

      <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-full p-1">
        {pills.map((pill) => {
          const ativo = isAtivo({ mes, ano }, pill.state);
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => setPeriodo(pill.state)}
              className={`px-3 h-7 rounded-full text-xs transition font-mono-num ${
                ativo
                  ? 'bg-accent text-[#0B0B0D] font-medium'
                  : 'text-text-2 hover:text-text hover:bg-surface-3'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

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
