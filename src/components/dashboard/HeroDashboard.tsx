import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Siren,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { DashboardData } from '../../hooks/useDashboard';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataExtenso(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export interface InsightInfo {
  icon: LucideIcon;
  texto: string;
  tom: 'warn' | 'amber' | 'accent' | 'muted';
}

export function calcularInsight(data: DashboardData | undefined): InsightInfo {
  if (!data) {
    return { icon: CheckCircle2, texto: 'Carregando...', tom: 'muted' };
  }
  const { metricas, pendentes_total, pedidos_metricas } = data;

  if (pedidos_metricas.atrasados > 0) {
    return {
      icon: Siren,
      texto: `${pedidos_metricas.atrasados} ${pedidos_metricas.atrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'}`,
      tom: 'warn',
    };
  }
  if (metricas.total_divergentes > 0) {
    return {
      icon: AlertTriangle,
      texto: `${metricas.total_divergentes} ${metricas.total_divergentes === 1 ? 'nota com divergência' : 'notas com divergência'}`,
      tom: 'warn',
    };
  }
  if (pedidos_metricas.quase_fechando > 0) {
    return {
      icon: Package,
      texto: `${pedidos_metricas.quase_fechando} ${pedidos_metricas.quase_fechando === 1 ? 'pedido quase fechando' : 'pedidos quase fechando'}`,
      tom: 'amber',
    };
  }
  if (pendentes_total.atrasadas > 0) {
    return {
      icon: Clock,
      texto: `${pendentes_total.atrasadas} ${pendentes_total.atrasadas === 1 ? 'nota aguardando há mais de 7 dias' : 'notas aguardando há mais de 7 dias'}`,
      tom: 'amber',
    };
  }
  return {
    icon: CheckCircle2,
    texto: 'Aqui está o resumo de toda a sua operação',
    tom: 'accent',
  };
}

const tomClass: Record<InsightInfo['tom'], string> = {
  warn: 'bg-warn-soft-bg text-warn border-warn-soft-border',
  amber: 'bg-amber-soft-bg text-amber border-amber-soft-border',
  accent: 'bg-accent-soft-bg text-accent border-accent-soft-border',
  muted: 'bg-surface-2 text-text-3 border-border',
};

export function HeroDashboard({ insight }: { insight: InsightInfo }) {
  const { perfil } = useAuth();
  if (!perfil) return null;
  const primeiro = perfil.nome.split(' ')[0];
  const Icon = insight.icon;

  return (
    <header>
      <p className="text-xs uppercase tracking-[0.12em] text-text-3 font-mono-num mb-2">
        {dataExtenso()}
      </p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight mb-3">
        {saudacao()}, {primeiro}
        <span className="text-accent">.</span>
      </h1>
      <span
        className={`inline-flex items-center gap-2 px-3 h-8 rounded-full text-sm border ${tomClass[insight.tom]}`}
      >
        <Icon size={14} />
        {insight.texto}
      </span>
    </header>
  );
}
