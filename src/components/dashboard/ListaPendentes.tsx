import { ArrowRight, Clock, PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { AvatarCliente } from '../ui/AvatarCliente';
import { EmptyState } from '../ui/EmptyState';
import { brl, formatarData, kg as fmtKg } from '../../lib/formatters';
import type { DashboardPendente } from '../../hooks/useDashboard';

interface Props {
  pendentes: DashboardPendente[];
  totalGeral: number;
  podeReceber: boolean;
  onLancar: (p: DashboardPendente) => void;
}

export function ListaPendentes({ pendentes, totalGeral, podeReceber, onLancar }: Props) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-text-3" />
          <p className="text-xs uppercase tracking-[0.16em] text-text-3">
            Pendentes de conferência
          </p>
        </div>
        {totalGeral > pendentes.length && (
          <Link
            to="/nfs"
            className="text-xs text-text-2 hover:text-accent transition inline-flex items-center gap-1"
          >
            Ver todas ({totalGeral}) <ArrowRight size={11} />
          </Link>
        )}
      </div>

      {pendentes.length === 0 ? (
        <EmptyState
          icon={<PackageCheck size={28} />}
          titulo="Tudo em dia"
          descricao="Nenhuma NF aguardando conferência."
        />
      ) : (
        <ul>
          {pendentes.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border-soft last:border-b-0 hover:bg-surface-2/60 transition"
            >
              <AvatarCliente nome={p.cliente_nome} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-text truncate">{p.cliente_nome}</p>
                  <BadgeIdade dias={p.dias} />
                </div>
                <p className="text-xs text-text-3 truncate font-mono-num">
                  NF {p.numero} · {formatarData(p.data)}
                  {p.material ? ` · ${p.material}` : ''}
                </p>
              </div>
              <div className="hidden sm:block text-right text-xs">
                <p className="text-text-2 font-mono-num">{fmtKg(p.peso)}</p>
                <p className="text-text font-mono-num">{brl(p.valor_final)}</p>
              </div>
              {podeReceber && (
                <button
                  type="button"
                  onClick={() => onLancar(p)}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs bg-accent-soft-bg text-accent border border-accent-soft-border hover:brightness-125 transition flex-shrink-0"
                >
                  <PackageCheck size={12} /> Lançar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BadgeIdade({ dias }: { dias: number }) {
  if (dias === 0) {
    return (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded-md bg-surface-3 text-text-3 border border-border">
        hoje
      </span>
    );
  }
  if (dias > 7) {
    return (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded-md bg-warn-soft-bg text-warn border border-warn-soft-border">
        {dias} dias
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded-md bg-amber-soft-bg text-amber border border-amber-soft-border">
      {dias} {dias === 1 ? 'dia' : 'dias'}
    </span>
  );
}
