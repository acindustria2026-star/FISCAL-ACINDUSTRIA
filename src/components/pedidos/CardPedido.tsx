import { ArrowRight } from 'lucide-react';
import { AvatarCliente } from '../ui/AvatarCliente';
import { StatusPedido } from './StatusPedido';
import { calcularStatus, type PedidoComEntregue, type StatusCalculado } from '../../hooks/usePedidos';
import { brl4, formatarData, kg as fmtKg } from '../../lib/formatters';

interface Props {
  pedido: PedidoComEntregue;
  onClick: () => void;
}

const corBarraPorStatus: Record<StatusCalculado, string> = {
  ativo: 'from-accent-dark to-accent',
  'quase-fechando': 'from-accent-dark to-amber',
  'pronto-pra-concluir': 'from-accent-dark to-accent',
  atrasado: 'from-[#7a2828] to-warn',
  concluido: 'from-text-3 to-text-2',
};

export function CardPedido({ pedido, onClick }: Props) {
  const status = calcularStatus(pedido);
  const total = Number(pedido.peso_total);
  const pct = total > 0 ? Math.min(100, (pedido.entregue / total) * 100) : 0;
  const saldo = Math.max(pedido.saldo, 0);
  const barraGradient = corBarraPorStatus[status];

  const concluido = status === 'concluido';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left bg-surface border rounded-[14px] p-5 transition hover:-translate-y-0.5 ${
        status === 'atrasado'
          ? 'border-warn-soft-border'
          : status === 'pronto-pra-concluir'
            ? 'border-accent'
            : 'border-border hover:border-accent-soft-border'
      } ${concluido ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <AvatarCliente nome={pedido.cliente_nome} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-text font-mono-num font-medium">{pedido.numero}</span>
            <StatusPedido status={status} />
          </div>
          <p className="text-sm text-text-2 truncate">
            {pedido.cliente_nome}
            {pedido.material && <span className="text-text-3"> · {pedido.material}</span>}
          </p>
        </div>
        <ArrowRight
          size={16}
          className="text-text-3 mt-1 opacity-0 group-hover:opacity-100 group-hover:text-accent transition flex-shrink-0"
        />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden relative">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barraGradient} transition-[width] duration-500 relative overflow-hidden`}
            style={{ width: `${pct}%` }}
          >
            {!concluido && (
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                }}
              />
            )}
          </div>
        </div>
        <span className="text-xs text-text-2 font-mono-num min-w-[44px] text-right">
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <Item label="Entregue" valor={fmtKg(pedido.entregue)} cor="default" />
        <Item label="de" valor={fmtKg(total)} cor="muted" />
        <Item label="Falta" valor={fmtKg(saldo)} cor={saldo === 0 ? 'accent' : 'default'} />
        {pedido.preco_referencia !== null && (
          <Item label="Ref." valor={`${brl4(pedido.preco_referencia)}/kg`} cor="muted" />
        )}
        {pedido.prazo && (
          <Item
            label="Prazo"
            valor={formatarData(pedido.prazo)}
            cor={status === 'atrasado' ? 'warn' : 'muted'}
          />
        )}
        <Item
          label="NFs"
          valor={String(pedido.qtdNfs)}
          cor="muted"
        />
      </div>
    </button>
  );
}

function Item({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: string;
  cor: 'default' | 'accent' | 'muted' | 'warn';
}) {
  const corClass = {
    default: 'text-text',
    accent: 'text-accent',
    muted: 'text-text-3',
    warn: 'text-warn',
  }[cor];
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-text-3 text-[10px] uppercase tracking-wider">{label}</span>
      <span className={`font-mono-num ${corClass}`}>{valor}</span>
    </span>
  );
}
