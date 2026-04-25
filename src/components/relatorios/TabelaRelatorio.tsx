import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';
import { ThOrdenavel } from '../ui/ThOrdenavel';
import {
  ordenar,
  type EstadoOrdenacao,
  type ExtrairOrdenacao,
} from '../../hooks/useOrdenacao';

export interface ColunaRelatorio<T> {
  key: string;
  label: string;
  ordenavel?: boolean;
  align?: 'left' | 'right';
  extrair?: (item: T) => string | number | null;
  render: (item: T) => ReactNode;
  /** valor textual pra impressão; default = string do extrair */
  printValue?: (item: T) => string;
  /** se definido, exibe linha de total no tfoot */
  total?: (itens: T[]) => ReactNode;
  /** valor textual de total pra impressão */
  printTotal?: (itens: T[]) => string;
  /** label do total (substitui o valor da célula no tfoot quando outras colunas têm total). */
  totalLabel?: string;
  className?: string;
}

interface Props<T> {
  itens: T[];
  colunas: ColunaRelatorio<T>[];
  estado: EstadoOrdenacao;
  onToggle: (col: string) => void;
  isLoading?: boolean;
  emptyTitulo?: string;
  emptyDescricao?: string;
  emptyIcon?: ReactNode;
  rowKey: (item: T) => string;
  minWidth?: number;
}

export function TabelaRelatorio<T>({
  itens,
  colunas,
  estado,
  onToggle,
  isLoading,
  emptyTitulo = 'Sem dados no período',
  emptyDescricao = 'Tente outro período ou cadastre dados.',
  emptyIcon,
  rowKey,
  minWidth = 800,
}: Props<T>) {
  if (isLoading) return <Loading fullScreen={false} text="Carregando..." />;

  if (itens.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState icon={emptyIcon} titulo={emptyTitulo} descricao={emptyDescricao} />
      </Card>
    );
  }

  const extrair: ExtrairOrdenacao<T> = {};
  for (const c of colunas) {
    if (c.ordenavel && c.extrair) extrair[c.key] = c.extrair;
  }
  const ordenados = ordenar(itens, estado, extrair);

  const temTotal = colunas.some((c) => c.total);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth }}>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
              {colunas.map((c) =>
                c.ordenavel ? (
                  <ThOrdenavel
                    key={c.key}
                    label={c.label}
                    col={c.key}
                    estado={estado}
                    onToggle={onToggle}
                    align={c.align}
                  />
                ) : (
                  <th
                    key={c.key}
                    className={`px-3 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.className ?? ''}`}
                  >
                    {c.label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((item) => (
              <tr
                key={rowKey(item)}
                className="border-b border-border-soft last:border-b-0 hover:bg-surface-2/60 transition"
              >
                {colunas.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-3 text-sm ${c.align === 'right' ? 'text-right font-mono-num' : ''} ${c.className ?? ''}`}
                  >
                    {c.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {temTotal && (
            <tfoot>
              <tr className="border-t-2 border-accent-soft-border bg-accent-soft-bg/50">
                {colunas.map((c, idx) => (
                  <td
                    key={c.key}
                    className={`px-3 py-3 text-sm ${
                      c.align === 'right' ? 'text-right font-mono-num' : ''
                    } ${c.total ? 'text-accent font-medium' : 'text-text-3 text-xs uppercase tracking-wider'}`}
                  >
                    {c.total ? c.total(itens) : idx === 0 ? 'Total' : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}
