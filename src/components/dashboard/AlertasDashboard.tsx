import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, Package, type LucideIcon } from 'lucide-react';
import type { DashboardData } from '../../hooks/useDashboard';

type Tom = 'warn' | 'amber';

interface Alerta {
  key: string;
  icon: LucideIcon;
  titulo: string;
  detalhe?: string;
  tom: Tom;
  rota: string;
}

function montarAlertas(data: DashboardData): Alerta[] {
  const alertas: Alerta[] = [];
  const { metricas, pendentes_total, pedidos_metricas } = data;

  if (pedidos_metricas.atrasados > 0) {
    alertas.push({
      key: 'pedidos-atrasados',
      icon: AlertTriangle,
      tom: 'warn',
      titulo: `${pedidos_metricas.atrasados} ${pedidos_metricas.atrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'}`,
      detalhe: 'Prazo já passou e ainda não fechou',
      rota: '/pedidos',
    });
  }

  if (metricas.total_divergentes > 0) {
    alertas.push({
      key: 'divergencias',
      icon: AlertTriangle,
      tom: 'warn',
      titulo: `${metricas.total_divergentes} ${metricas.total_divergentes === 1 ? 'recebimento divergente' : 'recebimentos divergentes'}`,
      detalhe: 'Diferença acima de 2% entre peso emitido e recebido',
      rota: '/recebimentos',
    });
  }

  if (pendentes_total.atrasadas > 0) {
    alertas.push({
      key: 'em-aberto-atrasadas',
      icon: Clock,
      tom: 'amber',
      titulo: `${pendentes_total.atrasadas} ${pendentes_total.atrasadas === 1 ? 'NF aguardando' : 'NFs aguardando'} há mais de 7 dias`,
      detalhe: 'Cliente ainda não confirmou o recebimento',
      rota: '/em-aberto',
    });
  }

  if (pedidos_metricas.quase_fechando > 0) {
    alertas.push({
      key: 'pedidos-fechando',
      icon: Package,
      tom: 'amber',
      titulo: `${pedidos_metricas.quase_fechando} ${pedidos_metricas.quase_fechando === 1 ? 'pedido' : 'pedidos'} acima de 80% entregues`,
      detalhe: 'Próximos da conclusão',
      rota: '/pedidos',
    });
  }

  return alertas;
}

const tomClass: Record<Tom, string> = {
  warn: 'border-warn-soft-border bg-warn-soft-bg text-warn',
  amber: 'border-amber-soft-border bg-amber-soft-bg text-amber',
};

export function AlertasDashboard({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const alertas = montarAlertas(data);

  if (alertas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alertas.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={() => navigate(a.rota)}
          className={`group flex items-center gap-3 p-3.5 pr-4 rounded-xl border transition hover:brightness-125 ${tomClass[a.tom]}`}
        >
          <a.icon size={16} className="flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-text">{a.titulo}</p>
            {a.detalhe && <p className="text-xs text-text-2 mt-0.5">{a.detalhe}</p>}
          </div>
          <ArrowRight size={14} className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition" />
        </button>
      ))}
    </div>
  );
}
