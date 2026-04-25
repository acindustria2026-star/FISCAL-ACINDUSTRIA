import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePeriodo } from '../contexts/PeriodoContext';

export interface DashboardMetricas {
  total_emitidas: number;
  total_recebimentos: number;
  total_conferidas: number;
  total_divergentes: number;
  total_em_aberto: number;
  valor_em_aberto: number;
  peso_em_aberto: number;
  valor_total_emitidas: number;
  total_impostos: number;
}

export interface DashboardPendente {
  id: string;
  numero: string;
  data: string;
  peso: number;
  valor_final: number;
  cliente_nome: string;
  material: string | null;
  dias: number;
}

export interface DashboardPendentesTotal {
  total: number;
  atrasadas: number;
}

export interface DashboardPedido {
  id: string;
  numero: string;
  cliente_nome: string;
  material: string | null;
  peso_total: number;
  prazo: string | null;
  entregue: number;
}

export interface DashboardPedidosMetricas {
  total: number;
  atrasados: number;
  quase_fechando: number;
}

export interface DashboardData {
  periodo: { inicio: string; fim: string };
  metricas: DashboardMetricas;
  pendentes: DashboardPendente[];
  pendentes_total: DashboardPendentesTotal;
  pedidos: DashboardPedido[];
  pedidos_metricas: DashboardPedidosMetricas;
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizarMetricas(raw: Record<string, unknown>): DashboardMetricas {
  return {
    total_emitidas: num(raw.total_emitidas),
    total_recebimentos: num(raw.total_recebimentos),
    total_conferidas: num(raw.total_conferidas),
    total_divergentes: num(raw.total_divergentes),
    total_em_aberto: num(raw.total_em_aberto),
    valor_em_aberto: num(raw.valor_em_aberto),
    peso_em_aberto: num(raw.peso_em_aberto),
    valor_total_emitidas: num(raw.valor_total_emitidas),
    total_impostos: num(raw.total_impostos),
  };
}

function normalizarPendente(raw: Record<string, unknown>): DashboardPendente {
  return {
    id: String(raw.id ?? ''),
    numero: String(raw.numero ?? ''),
    data: String(raw.data ?? ''),
    peso: num(raw.peso),
    valor_final: num(raw.valor_final),
    cliente_nome: String(raw.cliente_nome ?? ''),
    material: (raw.material as string | null) ?? null,
    dias: num(raw.dias),
  };
}

function normalizarPedido(raw: Record<string, unknown>): DashboardPedido {
  return {
    id: String(raw.id ?? ''),
    numero: String(raw.numero ?? ''),
    cliente_nome: String(raw.cliente_nome ?? ''),
    material: (raw.material as string | null) ?? null,
    peso_total: num(raw.peso_total),
    prazo: (raw.prazo as string | null) ?? null,
    entregue: num(raw.entregue),
  };
}

export function useDashboard() {
  const { mes, ano } = usePeriodo();

  return useQuery<DashboardData>({
    queryKey: ['dashboard', mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_resumo', {
        p_mes: mes,
        p_ano: ano,
      });
      if (error) throw error;
      const raw = data as unknown as Record<string, unknown>;

      if (raw.erro) throw new Error(String(raw.erro));

      const periodo = (raw.periodo ?? {}) as { inicio?: string; fim?: string };
      const pendentesArr = Array.isArray(raw.pendentes) ? (raw.pendentes as Record<string, unknown>[]) : [];
      const pedidosArr = Array.isArray(raw.pedidos) ? (raw.pedidos as Record<string, unknown>[]) : [];

      return {
        periodo: { inicio: periodo.inicio ?? '', fim: periodo.fim ?? '' },
        metricas: normalizarMetricas((raw.metricas ?? {}) as Record<string, unknown>),
        pendentes: pendentesArr.map(normalizarPendente),
        pendentes_total: {
          total: num((raw.pendentes_total as Record<string, unknown> | undefined)?.total),
          atrasadas: num((raw.pendentes_total as Record<string, unknown> | undefined)?.atrasadas),
        },
        pedidos: pedidosArr.map(normalizarPedido),
        pedidos_metricas: {
          total: num((raw.pedidos_metricas as Record<string, unknown> | undefined)?.total),
          atrasados: num((raw.pedidos_metricas as Record<string, unknown> | undefined)?.atrasados),
          quase_fechando: num((raw.pedidos_metricas as Record<string, unknown> | undefined)?.quase_fechando),
        },
      };
    },
  });
}
