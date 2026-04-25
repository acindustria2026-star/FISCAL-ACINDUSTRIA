import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, PackageCheck, ShieldCheck } from 'lucide-react';
import { StatCard } from './StatCard';
import type { DashboardMetricas } from '../../hooks/useDashboard';

interface Props {
  metricas: DashboardMetricas;
}

export function GridStatCards({ metricas }: Props) {
  const navigate = useNavigate();

  const pctConferidas =
    metricas.total_recebimentos > 0
      ? Math.round((metricas.total_conferidas / metricas.total_recebimentos) * 100)
      : 0;

  const pendentes = metricas.total_emitidas - metricas.total_recebimentos;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={FileText}
        label="Emitidas"
        valor={metricas.total_emitidas}
        sublabel="no período"
        onClick={() => navigate('/nfs')}
      />
      <StatCard
        icon={PackageCheck}
        label="Recebimentos"
        valor={metricas.total_recebimentos}
        sublabel={
          pendentes > 0
            ? `${pendentes} ${pendentes === 1 ? 'NF pendente' : 'NFs pendentes'}`
            : 'todas conferidas'
        }
        onClick={() => navigate('/recebimentos')}
      />
      <StatCard
        icon={ShieldCheck}
        label="Conferidas"
        valor={metricas.total_conferidas}
        sublabel={
          metricas.total_recebimentos > 0
            ? `${pctConferidas}% dos recebidos · até 2% diff`
            : 'sem recebimentos'
        }
        corValor={metricas.total_recebimentos > 0 ? 'accent' : 'muted'}
        onClick={() => navigate('/recebimentos')}
      />
      <StatCard
        icon={AlertTriangle}
        label="Divergentes"
        valor={metricas.total_divergentes}
        sublabel={
          metricas.total_divergentes > 0 ? 'diferença > 2%' : 'tudo ok no período'
        }
        corValor={metricas.total_divergentes > 0 ? 'warn' : 'muted'}
        destaque={metricas.total_divergentes > 0}
        onClick={() => navigate('/recebimentos')}
      />
    </div>
  );
}
