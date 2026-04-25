import { Check, Pencil, Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';
import { AvatarCliente } from '../ui/AvatarCliente';
import { ThOrdenavel } from '../ui/ThOrdenavel';
import {
  ordenar,
  type EstadoOrdenacao,
  type ExtrairOrdenacao,
} from '../../hooks/useOrdenacao';
import { brl, formatarData } from '../../lib/formatters';
import type { ItemFinanceiro } from '../../hooks/useFinanceiro';
import type { AbaFinanceiro } from './MetricasFinanceiro';

interface Props {
  itens: ItemFinanceiro[];
  aba: AbaFinanceiro;
  estadoSort: EstadoOrdenacao;
  onToggleSort: (col: string) => void;
  isLoading: boolean;
  onMarcarPago: (item: ItemFinanceiro) => void;
  onEditarRecebimento: (item: ItemFinanceiro) => void;
}

const extracoes: Record<AbaFinanceiro, ExtrairOrdenacao<ItemFinanceiro>> = {
  pagas: {
    numero: (i) => i.nf.numero,
    data: (i) => i.nf.data,
    valor_emitido: (i) => Number(i.nf.valor_final),
    valor_pago: (i) => i.valorAcordado,
    diferenca: (i) => i.diferenca ?? 0,
    pago_em: (i) => i.dataPagamento,
    cliente: (i) => i.nf.cliente_nome,
  },
  aReceber: {
    numero: (i) => i.nf.numero,
    data: (i) => i.nf.data,
    valor: (i) => i.valorAcordado,
    previsto: (i) => i.dataPagamento,
    cliente: (i) => i.nf.cliente_nome,
  },
  atrasadas: {
    numero: (i) => i.nf.numero,
    data: (i) => i.nf.data,
    valor: (i) => i.valorAcordado,
    previsto: (i) => i.dataPagamento,
    atraso: (i) => i.diasAtraso ?? 0,
    cliente: (i) => i.nf.cliente_nome,
  },
};

const empty: Record<AbaFinanceiro, { titulo: string; descricao: string }> = {
  pagas: { titulo: 'Nenhum recebimento pago', descricao: 'Quando houver pagamentos confirmados, aparecem aqui.' },
  aReceber: { titulo: 'Sem pendências', descricao: 'Tudo já foi pago — bom trabalho.' },
  atrasadas: { titulo: 'Nada atrasado', descricao: 'Sem NFs vencidas. Continue assim.' },
};

export function TabelaFinanceiro({
  itens,
  aba,
  estadoSort,
  onToggleSort,
  isLoading,
  onMarcarPago,
  onEditarRecebimento,
}: Props) {
  if (isLoading) return <Loading fullScreen={false} text="Carregando financeiro..." />;
  if (itens.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<Wallet size={32} />}
          titulo={empty[aba].titulo}
          descricao={empty[aba].descricao}
        />
      </Card>
    );
  }

  const ordenados = ordenar(itens, estadoSort, extracoes[aba]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
              <th className="w-1.5" />
              <ThOrdenavel label="Nº NF" col="numero" estado={estadoSort} onToggle={onToggleSort} />
              <ThOrdenavel label="Emissão" col="data" estado={estadoSort} onToggle={onToggleSort} />
              {aba === 'pagas' && (
                <>
                  <ThOrdenavel label="Val emitido" col="valor_emitido" estado={estadoSort} onToggle={onToggleSort} align="right" />
                  <ThOrdenavel label="Val pago" col="valor_pago" estado={estadoSort} onToggle={onToggleSort} align="right" />
                  <ThOrdenavel label="Diferença" col="diferenca" estado={estadoSort} onToggle={onToggleSort} align="right" />
                  <ThOrdenavel label="Pago em" col="pago_em" estado={estadoSort} onToggle={onToggleSort} />
                </>
              )}
              {aba === 'aReceber' && (
                <>
                  <ThOrdenavel label="Valor" col="valor" estado={estadoSort} onToggle={onToggleSort} align="right" />
                  <ThOrdenavel label="Previsto p/" col="previsto" estado={estadoSort} onToggle={onToggleSort} />
                  <th className="px-3 py-2.5 font-medium">Situação</th>
                </>
              )}
              {aba === 'atrasadas' && (
                <>
                  <ThOrdenavel label="Valor" col="valor" estado={estadoSort} onToggle={onToggleSort} align="right" />
                  <ThOrdenavel label="Previsto p/" col="previsto" estado={estadoSort} onToggle={onToggleSort} />
                  <ThOrdenavel label="Atraso" col="atraso" estado={estadoSort} onToggle={onToggleSort} />
                </>
              )}
              <ThOrdenavel label="Cliente" col="cliente" estado={estadoSort} onToggle={onToggleSort} />
              <th className="px-3 py-2.5 font-medium text-right w-32" />
            </tr>
          </thead>
          <tbody>
            {ordenados.map((item) => (
              <Linha
                key={item.nf.id}
                item={item}
                aba={aba}
                onMarcarPago={onMarcarPago}
                onEditar={onEditarRecebimento}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Linha({
  item,
  aba,
  onMarcarPago,
  onEditar,
}: {
  item: ItemFinanceiro;
  aba: AbaFinanceiro;
  onMarcarPago: (item: ItemFinanceiro) => void;
  onEditar: (item: ItemFinanceiro) => void;
}) {
  const corBarra =
    aba === 'atrasadas'
      ? 'bg-warn'
      : aba === 'pagas'
        ? 'bg-accent/80'
        : item.semRecebimento
          ? 'bg-text-3'
          : 'bg-accent';

  return (
    <tr
      className="border-b border-border-soft last:border-b-0 hover:bg-gradient-to-r hover:from-accent-soft-bg/40 hover:to-surface-2 transition"
    >
      <td className="px-1 py-3.5">
        <div className={`w-1 h-8 rounded-full ${corBarra} ml-1`} />
      </td>
      <td className="px-3 py-3.5 text-sm text-text font-mono-num">{item.nf.numero}</td>
      <td className="px-3 py-3.5 text-sm text-text-2 font-mono-num whitespace-nowrap">
        {formatarData(item.nf.data)}
      </td>

      {aba === 'pagas' && (
        <>
          <td className="px-3 py-3.5 text-sm text-text-2 font-mono-num text-right">
            {brl(item.nf.valor_final)}
          </td>
          <td className="px-3 py-3.5 text-right">
            <span
              className="font-serif-display font-mono-num text-accent font-semibold"
              style={{ fontSize: 16 }}
            >
              {brl(item.valorAcordado)}
            </span>
          </td>
          <td className="px-3 py-3.5 text-right">
            <PillDiferenca diferenca={item.diferenca} />
          </td>
          <td className="px-3 py-3.5 text-sm text-text-2 font-mono-num whitespace-nowrap">
            {item.dataPagamento ? formatarData(item.dataPagamento) : '—'}
          </td>
        </>
      )}

      {aba === 'aReceber' && (
        <>
          <td className="px-3 py-3.5 text-right">
            <span className="font-mono-num text-text font-medium">
              {brl(item.valorAcordado)}
            </span>
          </td>
          <td className="px-3 py-3.5 text-sm text-text-2 font-mono-num whitespace-nowrap">
            {item.dataPagamento ? formatarData(item.dataPagamento) : '—'}
          </td>
          <td className="px-3 py-3.5">
            <PillSituacaoAReceber item={item} />
          </td>
        </>
      )}

      {aba === 'atrasadas' && (
        <>
          <td className="px-3 py-3.5 text-right">
            <span className="font-mono-num text-text font-medium">
              {brl(item.valorAcordado)}
            </span>
          </td>
          <td className="px-3 py-3.5 text-sm text-text-2 font-mono-num whitespace-nowrap">
            {item.dataPagamento ? formatarData(item.dataPagamento) : '—'}
          </td>
          <td className="px-3 py-3.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-warn-soft-bg text-warn border-warn-soft-border">
              ⚠ {item.diasAtraso ?? 0}d atrasado
            </span>
          </td>
        </>
      )}

      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <AvatarCliente nome={item.nf.cliente_nome} size={28} />
          <span className="text-sm text-text truncate">{item.nf.cliente_nome}</span>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <div className="flex justify-end gap-1.5">
          {(aba === 'aReceber' || aba === 'atrasadas') && (
            <button
              type="button"
              onClick={() => onMarcarPago(item)}
              title={item.semRecebimento ? 'Lançar recebimento' : 'Marcar como pago'}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] uppercase tracking-[0.08em] font-bold bg-accent-soft-bg text-accent border border-accent-soft-border hover:bg-accent hover:text-[#0B0B0D] transition"
            >
              <Check size={11} /> {item.semRecebimento ? 'Lançar' : 'Pago'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEditar(item)}
            aria-label={item.semRecebimento ? 'Lançar recebimento' : 'Editar recebimento'}
            title={item.semRecebimento ? 'Lançar recebimento' : 'Editar recebimento'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-2 hover:text-text hover:bg-surface-3 transition"
          >
            <Pencil size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PillDiferenca({ diferenca }: { diferenca: number | null }) {
  if (diferenca === null || Math.abs(diferenca) < 0.01) {
    return <span className="text-xs text-text-3 font-mono-num">—</span>;
  }
  const positivo = diferenca > 0;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono-num border ${
        positivo
          ? 'bg-accent-soft-bg text-accent border-accent-soft-border'
          : 'bg-warn-soft-bg text-warn border-warn-soft-border'
      }`}
    >
      {positivo ? '+' : '−'}
      {brl(Math.abs(diferenca))}
    </span>
  );
}

function PillSituacaoAReceber({ item }: { item: ItemFinanceiro }) {
  if (item.semRecebimento) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-surface-2 text-text-2 border-border">
        aguardando · {item.diasDesdeEmissao}d
      </span>
    );
  }
  if (item.diasParaVencer === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-surface-2 text-text-2 border-border">
        sem data
      </span>
    );
  }
  if (item.diasParaVencer === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-amber-soft-bg text-amber border-amber-soft-border">
        vence hoje
      </span>
    );
  }
  const tom = item.diasParaVencer <= 3 ? 'amber' : 'accent';
  const cls =
    tom === 'amber'
      ? 'bg-amber-soft-bg text-amber border-amber-soft-border'
      : 'bg-accent-soft-bg text-accent border-accent-soft-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      vence em {item.diasParaVencer}d
    </span>
  );
}
