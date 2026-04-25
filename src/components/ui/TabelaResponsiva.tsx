import type { ReactNode } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Loading } from './Loading';
import { ThOrdenavel } from './ThOrdenavel';
import {
  ordenar,
  type EstadoOrdenacao,
  type ExtrairOrdenacao,
} from '../../hooks/useOrdenacao';

export type Visibilidade = 'sempre' | 'mobile' | 'desktop';

export interface ColunaResp<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  ordenavel?: boolean;
  extrair?: (item: T) => string | number | null;
  render: (item: T) => ReactNode;
  /**
   * Onde a coluna aparece. Default: 'sempre'.
   * - 'desktop': só no desktop (≥768px)
   * - 'mobile': só no card mobile
   */
  visibilidade?: Visibilidade;
  /** Se true, exibe destacado no card mobile (canto superior direito) */
  destaque?: boolean;
  /** Se true, marca como "principal" — valor que vira título do card mobile (default: primeira coluna) */
  principal?: boolean;
  className?: string;
}

interface Props<T> {
  itens: T[];
  colunas: ColunaResp<T>[];
  estado?: EstadoOrdenacao;
  onToggle?: (col: string) => void;
  isLoading?: boolean;
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyTitulo?: string;
  emptyDescricao?: string;
  emptyIcon?: ReactNode;
  /** Renderizador customizado pra cards mobile (sobrescreve o default) */
  cardMobile?: (item: T) => ReactNode;
  minWidth?: number;
}

export function TabelaResponsiva<T>({
  itens,
  colunas,
  estado,
  onToggle,
  isLoading,
  rowKey,
  onRowClick,
  emptyTitulo = 'Sem dados',
  emptyDescricao,
  emptyIcon,
  cardMobile,
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
  const ordenados = estado ? ordenar(itens, estado, extrair) : itens;

  const colsMobile = colunas.filter((c) => (c.visibilidade ?? 'sempre') !== 'desktop');
  const colsDesktop = colunas.filter((c) => (c.visibilidade ?? 'sempre') !== 'mobile');

  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden flex flex-col gap-2">
        {ordenados.map((item) => {
          if (cardMobile) {
            return (
              <button
                key={rowKey(item)}
                type="button"
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                disabled={!onRowClick}
                className={`block w-full text-left bg-surface border border-border rounded-xl p-4 ${
                  onRowClick
                    ? 'active:bg-surface-2 hover:border-accent-soft-border transition'
                    : 'cursor-default'
                }`}
              >
                {cardMobile(item)}
              </button>
            );
          }
          return (
            <CardPadrao
              key={rowKey(item)}
              item={item}
              colunas={colsMobile}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            />
          );
        })}
      </div>

      {/* Desktop: tabela */}
      <Card className="p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
                {colsDesktop.map((c) =>
                  c.ordenavel && estado && onToggle ? (
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
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`border-b border-border-soft last:border-b-0 transition ${
                    onRowClick ? 'cursor-pointer hover:bg-surface-2/60' : 'hover:bg-surface-2/30'
                  }`}
                >
                  {colsDesktop.map((c) => (
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
          </table>
        </div>
      </Card>
    </>
  );
}

function CardPadrao<T>({
  item,
  colunas,
  onClick,
}: {
  item: T;
  colunas: ColunaResp<T>[];
  onClick?: () => void;
}) {
  const principal = colunas.find((c) => c.principal) ?? colunas[0];
  const destaque = colunas.find((c) => c.destaque);
  const secundarias = colunas
    .filter((c) => c !== principal && c !== destaque && (c.visibilidade ?? 'sempre') !== 'desktop')
    .slice(0, 4);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`block w-full text-left bg-surface border border-border rounded-xl p-4 ${
        onClick ? 'active:bg-surface-2 hover:border-accent-soft-border transition' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0 text-sm text-text font-medium">
          {principal.render(item)}
        </div>
        {destaque && (
          <div className="font-serif-display font-mono-num text-accent text-lg flex-shrink-0">
            {destaque.render(item)}
          </div>
        )}
      </div>
      {secundarias.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {secundarias.map((c) => (
            <div key={c.key} className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-text-3">{c.label}</p>
              <div className={`text-text-2 truncate ${c.align === 'right' ? 'font-mono-num' : ''}`}>
                {c.render(item)}
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
