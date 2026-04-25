import { useCallback, useState } from 'react';

export type DirOrdenacao = 'asc' | 'desc';

export interface EstadoOrdenacao {
  col: string | null;
  dir: DirOrdenacao;
}

export type ExtrairOrdenacao<T> = Record<
  string,
  (item: T) => string | number | null | undefined
>;

const DEFAULT: EstadoOrdenacao = { col: null, dir: 'desc' };

export function useOrdenacao(inicial: EstadoOrdenacao = DEFAULT) {
  const [estado, setEstado] = useState<EstadoOrdenacao>(inicial);

  const toggle = useCallback((col: string) => {
    setEstado((curr) => {
      if (curr.col !== col) return { col, dir: 'desc' };
      if (curr.dir === 'desc') return { col, dir: 'asc' };
      return { col: null, dir: 'desc' };
    });
  }, []);

  const reset = useCallback(() => setEstado(DEFAULT), []);

  return { estado, toggle, reset };
}

export function ordenar<T>(
  arr: T[],
  estado: EstadoOrdenacao,
  extrair: ExtrairOrdenacao<T>,
): T[] {
  if (!estado.col || !extrair[estado.col]) return arr;
  const fn = extrair[estado.col];
  const sentido = estado.dir === 'asc' ? 1 : -1;
  return [...arr].sort((a, b) => {
    const va = fn(a);
    const vb = fn(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb, 'pt-BR') * sentido;
    }
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * sentido;
    }
    return String(va).localeCompare(String(vb), 'pt-BR') * sentido;
  });
}
