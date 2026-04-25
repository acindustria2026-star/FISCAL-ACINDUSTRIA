import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePeriodo } from '../contexts/PeriodoContext';
import { useFinanceiro, type ItemFinanceiro } from './useFinanceiro';
import { useComparativo, type ItemComparativo } from './useComparativo';
import { useNfsEmAberto } from './useNfsEmAberto';
import type { NotaFiscalRow } from '../types/database';

// ─── Impureza ──────────────────────────────────────────────────────────

export interface ItemImpureza {
  material: string;
  peso_total: number;
  impureza_total: number;
  impureza_media: number;
  qtd_recebimentos: number;
  cliente_principal: string | null;
}

export interface MetricasImpureza {
  total_impureza: number;
  total_peso: number;
  pct_medio: number;
  materiais_afetados: number;
  qtd_recebimentos: number;
}

export interface RelatorioImpureza {
  itens: ItemImpureza[];
  metricas: MetricasImpureza;
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function useRelatorioImpureza() {
  const { mes, ano } = usePeriodo();
  return useQuery<RelatorioImpureza>({
    queryKey: ['relatorio-impureza', mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('relatorio_impureza', {
        p_mes: mes,
        p_ano: ano,
      });
      if (error) throw error;
      const raw = data as unknown as Record<string, unknown>;
      if (raw.erro) throw new Error(String(raw.erro));

      const itensArr = Array.isArray(raw.itens) ? (raw.itens as Record<string, unknown>[]) : [];
      const m = (raw.metricas ?? {}) as Record<string, unknown>;

      return {
        itens: itensArr.map((i) => ({
          material: String(i.material ?? ''),
          peso_total: num(i.peso_total),
          impureza_total: num(i.impureza_total),
          impureza_media: num(i.impureza_media),
          qtd_recebimentos: num(i.qtd_recebimentos),
          cliente_principal: (i.cliente_principal as string | null) ?? null,
        })),
        metricas: {
          total_impureza: num(m.total_impureza),
          total_peso: num(m.total_peso),
          pct_medio: num(m.pct_medio),
          materiais_afetados: num(m.materiais_afetados),
          qtd_recebimentos: num(m.qtd_recebimentos),
        },
      };
    },
  });
}

// ─── Diferença de peso ─────────────────────────────────────────────────

export interface ItemDiferencaPeso {
  nf: NotaFiscalRow;
  pesoEmitido: number;
  pesoLiquido: number;
  difKg: number;
  difPct: number;
  status: 'ok' | 'divergente';
  cliente_nome: string;
}

/**
 * Reaproveita useComparativo: filtra apenas itens com recebimento e diferença != 0
 */
export function useRelatorioDiferencaPeso(): {
  data: ItemDiferencaPeso[];
  isLoading: boolean;
} {
  const comp = useComparativo();
  const filtrados: ItemDiferencaPeso[] = (comp.data ?? [])
    .map((c: ItemComparativo) => {
      if (!c.rec || c.difPeso === null || Math.abs(c.difPeso) < 0.001) return null;
      return {
        nf: c.nf,
        pesoEmitido: c.pesoEmitido,
        pesoLiquido: c.pesoLiquido as number,
        difKg: c.difPeso,
        difPct: c.difPesoPct ?? 0,
        status: c.status === 'divergente' ? 'divergente' : 'ok',
        cliente_nome: c.nf.cliente_nome,
      };
    })
    .filter((x): x is ItemDiferencaPeso => x !== null);

  return { data: filtrados, isLoading: comp.isLoading };
}

// ─── Valor a receber ───────────────────────────────────────────────────

export interface ItemValorReceber {
  nf: NotaFiscalRow;
  valor: number;
  vencimento: string | null;
  diasEmAberto: number;
  diasAtraso: number | null;
  diasParaVencer: number | null;
  status: 'aReceber' | 'atrasada';
  cliente_nome: string;
}

export function useRelatorioValorReceber(): {
  data: ItemValorReceber[];
  isLoading: boolean;
} {
  const fin = useFinanceiro();
  const filtrados: ItemValorReceber[] = (fin.data?.itens ?? [])
    .filter(
      (i: ItemFinanceiro): i is ItemFinanceiro & { categoria: 'aReceber' | 'atrasada' } =>
        i.categoria !== 'pago',
    )
    .map((i) => ({
      nf: i.nf,
      valor: i.valorAcordado,
      vencimento: i.dataPagamento,
      diasEmAberto: i.diasDesdeEmissao,
      diasAtraso: i.diasAtraso,
      diasParaVencer: i.diasParaVencer,
      status: i.categoria,
      cliente_nome: i.nf.cliente_nome,
    }));

  return { data: filtrados, isLoading: fin.isLoading };
}

// ─── Em aberto ────────────────────────────────────────────────────────

export interface ItemEmAberto {
  nf: NotaFiscalRow;
  diasEmAberto: number;
  cliente_nome: string;
}

export function useRelatorioEmAberto(): {
  data: ItemEmAberto[];
  isLoading: boolean;
} {
  const aberto = useNfsEmAberto();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const itens: ItemEmAberto[] = (aberto.data ?? []).map((nf) => {
    const d = new Date(nf.data);
    d.setHours(0, 0, 0, 0);
    const dias = Math.max(0, Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
    return { nf, diasEmAberto: dias, cliente_nome: nf.cliente_nome };
  });

  return { data: itens, isLoading: aberto.isLoading };
}
