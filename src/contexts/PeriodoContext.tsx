import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface PeriodoState {
  mes: number | null;
  ano: number | null;
}

interface PeriodoContextType extends PeriodoState {
  setPeriodo: (next: PeriodoState) => void;
  formatarPeriodo: () => string;
  isTodos: boolean;
  isAnoSomente: boolean;
}

const PeriodoContext = createContext<PeriodoContextType | null>(null);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const hoje = useMemo(() => new Date(), []);
  const [state, setState] = useState<PeriodoState>({
    mes: hoje.getMonth(),
    ano: hoje.getFullYear(),
  });

  const setPeriodo = useCallback((next: PeriodoState) => setState(next), []);

  const formatarPeriodo = useCallback(() => {
    if (state.ano === null) return 'Todos os períodos';
    if (state.mes === null) return String(state.ano);
    return `${MESES_ABREV[state.mes]} · ${state.ano}`;
  }, [state]);

  const value = useMemo<PeriodoContextType>(
    () => ({
      mes: state.mes,
      ano: state.ano,
      setPeriodo,
      formatarPeriodo,
      isTodos: state.ano === null,
      isAnoSomente: state.ano !== null && state.mes === null,
    }),
    [state, setPeriodo, formatarPeriodo],
  );

  return <PeriodoContext.Provider value={value}>{children}</PeriodoContext.Provider>;
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error('usePeriodo precisa do PeriodoProvider');
  return ctx;
}

export { MESES_ABREV };
