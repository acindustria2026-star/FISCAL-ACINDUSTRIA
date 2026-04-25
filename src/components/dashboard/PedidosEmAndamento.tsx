import { ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { formatarData, kg as fmtKg } from '../../lib/formatters';
import type { DashboardPedido } from '../../hooks/useDashboard';

interface Props {
  pedidos: DashboardPedido[];
  totalGeral: number;
  podeEditar: boolean;
}

export function PedidosEmAndamento({ pedidos, totalGeral, podeEditar }: Props) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-text-3" />
          <p className="text-xs uppercase tracking-[0.16em] text-text-3">
            Pedidos em andamento
          </p>
        </div>
        {totalGeral > pedidos.length && (
          <Link
            to="/pedidos"
            className="text-xs text-text-2 hover:text-accent transition inline-flex items-center gap-1"
          >
            Ver todos ({totalGeral}) <ArrowRight size={11} />
          </Link>
        )}
      </div>

      {pedidos.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          titulo="Nenhum pedido ativo"
          descricao={
            podeEditar
              ? 'Crie o primeiro pedido em /pedidos pra acompanhar entregas.'
              : 'Quando houver pedidos ativos, eles aparecem aqui.'
          }
          acao={
            podeEditar ? (
              <Link to="/pedidos">
                <Button variant="secondary" size="sm">
                  Ir pra pedidos
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul>
          {pedidos.map((p) => {
            const pct = p.peso_total > 0 ? Math.min(p.entregue / p.peso_total, 1) : 0;
            const atrasado = !!p.prazo && new Date(p.prazo) < new Date();
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 px-4 py-3 border-b border-border-soft last:border-b-0 hover:bg-surface-2/60 transition"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm text-text truncate">
                      {p.cliente_nome}
                      {p.material && (
                        <span className="text-text-3"> · {p.material}</span>
                      )}
                    </p>
                    <p className="text-xs text-text-3 font-mono-num">
                      Pedido {p.numero}
                      {p.prazo && (
                        <>
                          {' · prazo '}
                          <span className={atrasado ? 'text-warn' : ''}>
                            {formatarData(p.prazo)}
                            {atrasado && ' (atrasado)'}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-xs flex-shrink-0">
                    <p className="text-text font-mono-num">
                      {fmtKg(p.entregue)} / {fmtKg(p.peso_total)}
                    </p>
                    <p className="text-text-3 font-mono-num">{Math.round(pct * 100)}%</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] ${atrasado ? 'bg-warn' : 'bg-accent'}`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
