import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePeriodo } from '../contexts/PeriodoContext';
import { useFinanceiro, type ItemFinanceiro } from './useFinanceiro';
import { useComparativo, type ItemComparativo } from './useComparativo';
import { useNfsEmAberto } from './useNfsEmAberto';
import type { MotivoComplementar, NotaFiscalRow } from '../types/database';

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

// ─── Notas pagas (NFs com recebimento + pago=true) ─────────────────────

export interface ItemNotaPaga {
  nf: NotaFiscalRow;
  valorPago: number;
  dataPagamento: string | null;
  cliente_nome: string;
}

export function useRelatorioNotasPagas(): {
  data: ItemNotaPaga[];
  isLoading: boolean;
} {
  const fin = useFinanceiro();
  const itens: ItemNotaPaga[] = (fin.data?.itens ?? [])
    .filter((i: ItemFinanceiro) => i.categoria === 'pago' && i.rec !== null)
    .map((i) => ({
      nf: i.nf,
      valorPago: Number(i.rec!.valor_pago) || 0,
      dataPagamento: i.rec!.data_pagamento,
      cliente_nome: i.nf.cliente_nome,
    }));

  return { data: itens, isLoading: fin.isLoading };
}

// ─── Preço real (valor pago / peso de origem) ─────────────────────────

export interface ItemPrecoReal {
  nf: NotaFiscalRow;
  pesoOrigem: number;
  valorPago: number;
  precoReal: number;
  cliente_nome: string;
  material: string;
}

export function useRelatorioPrecoReal(): {
  data: ItemPrecoReal[];
  isLoading: boolean;
} {
  const fin = useFinanceiro();
  const itens: ItemPrecoReal[] = (fin.data?.itens ?? [])
    .filter((i: ItemFinanceiro) => i.rec !== null)
    .map((i) => {
      const peso = Number(i.nf.peso) || 0;
      const valorPago = Number(i.rec!.valor_pago) || 0;
      return {
        nf: i.nf,
        pesoOrigem: peso,
        valorPago,
        precoReal: peso > 0 ? valorPago / peso : 0,
        cliente_nome: i.nf.cliente_nome,
        material: i.nf.material ?? '',
      };
    });

  return { data: itens, isLoading: fin.isLoading };
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

// ─── Conferência NFs Principais vs Recebimento + Complementares ──────

export type StatusConferencia = 'CONFERIDO' | 'ATENCAO' | 'DIVERGENTE' | 'AGUARDANDO';

export const TOLERANCIA_CONFERIDO = 1; // R$ 1,00 — arredondamento de centavos
export const TOLERANCIA_ATENCAO = 50; // R$ 50,00 — limite pra atenção

export interface NfPrincipalConf {
  id: string;
  numero: string;
  data: string;
  cliente_nome: string;
  material: string | null;
  peso: number;
  valor_final: number;
}

export interface RecebimentoConf {
  id: string;
  valor_pago: number;
  data_pagamento: string | null;
  pago_em: string | null;
}

export interface ComplementarConf {
  id: string;
  numero: string;
  data: string;
  valor_final: number;
  motivo_complementar: MotivoComplementar | null;
}

export interface ItemConferencia {
  nf: NfPrincipalConf;
  recebimentos: RecebimentoConf[];
  recebimentoPago: number;
  complementares: ComplementarConf[];
  totalComplementares: number;
  totalConfrontado: number;
  diferenca: number;
  status: StatusConferencia;
}

export interface ResumoConferencia {
  total: number;
  conferidos: number;
  atencao: number;
  divergentes: number;
  aguardando: number;
  valorNfs: number;
  valorRecebido: number;
  valorComplementares: number;
  diferencaTotal: number;
}

function ultimoDiaDoMes(ano: number, mes: number): string {
  const d = new Date(ano, mes + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function classificarStatus(recebimentoPago: number, diferenca: number): StatusConferencia {
  if (recebimentoPago === 0) return 'AGUARDANDO';
  const abs = Math.abs(diferenca);
  if (abs <= TOLERANCIA_CONFERIDO) return 'CONFERIDO';
  if (abs <= TOLERANCIA_ATENCAO) return 'ATENCAO';
  return 'DIVERGENTE';
}

export function useConferenciaComplementares() {
  const { mes, ano } = usePeriodo();
  return useQuery<{ itens: ItemConferencia[]; resumo: ResumoConferencia }>({
    queryKey: ['conferencia-complementares', mes, ano],
    queryFn: async () => {
      const resumoVazio: ResumoConferencia = {
        total: 0,
        conferidos: 0,
        atencao: 0,
        divergentes: 0,
        aguardando: 0,
        valorNfs: 0,
        valorRecebido: 0,
        valorComplementares: 0,
        diferencaTotal: 0,
      };

      // 1. Complementares emitidas no período (filtro de período vale aqui).
      // A NF principal pode ser de qualquer data — vem de Q2 abaixo sem
      // filtro de período.
      let complQuery = supabase
        .from('notas_fiscais')
        .select('id, numero, data, valor_final, motivo_complementar, nf_pai_id')
        .not('nf_pai_id', 'is', null)
        .order('data', { ascending: false });

      if (ano !== null && mes !== null) {
        complQuery = complQuery
          .gte('data', dataIso(ano, mes, 1))
          .lte('data', ultimoDiaDoMes(ano, mes));
      } else if (ano !== null) {
        complQuery = complQuery.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`);
      }

      const { data: complementares, error: errC } = await complQuery;
      if (errC) throw errC;

      if (!complementares || complementares.length === 0) {
        return { itens: [], resumo: resumoVazio };
      }

      // 2. IDs únicos das NFs principais vinculadas
      const idsPais = Array.from(
        new Set(
          complementares
            .map((c) => c.nf_pai_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (idsPais.length === 0) {
        return { itens: [], resumo: resumoVazio };
      }

      // 3. NFs principais vinculadas (sem filtro de período — onde quer que estejam)
      const { data: principais, error: errP } = await supabase
        .from('notas_fiscais')
        .select('id, numero, data, cliente_nome, material, peso, valor_final')
        .in('id', idsPais)
        .order('data', { ascending: false });
      if (errP) throw errP;

      const lista = (principais ?? []) as NfPrincipalConf[];
      if (lista.length === 0) {
        return { itens: [], resumo: resumoVazio };
      }

      // 4. Recebimentos PAGOS das principais
      const { data: recebimentos, error: errR } = await supabase
        .from('recebimentos')
        .select('id, nf_id, valor_pago, data_pagamento, pago_em')
        .in('nf_id', idsPais)
        .eq('pago', true);
      if (errR) throw errR;

      const recsByNf = new Map<string, RecebimentoConf[]>();
      for (const r of recebimentos ?? []) {
        const arr = recsByNf.get(r.nf_id) ?? [];
        arr.push({
          id: r.id,
          valor_pago: num(r.valor_pago),
          data_pagamento: r.data_pagamento,
          pago_em: r.pago_em,
        });
        recsByNf.set(r.nf_id, arr);
      }

      const complByNf = new Map<string, ComplementarConf[]>();
      for (const c of complementares) {
        if (!c.nf_pai_id) continue;
        const arr = complByNf.get(c.nf_pai_id) ?? [];
        arr.push({
          id: c.id,
          numero: c.numero,
          data: c.data,
          valor_final: num(c.valor_final),
          motivo_complementar: c.motivo_complementar,
        });
        complByNf.set(c.nf_pai_id, arr);
      }

      const itens: ItemConferencia[] = lista.map((p) => {
        const valorNf = num(p.valor_final);
        const recs = recsByNf.get(p.id) ?? [];
        const recebimentoPago = recs.reduce((s, r) => s + r.valor_pago, 0);

        const compls = complByNf.get(p.id) ?? [];
        const totalComplementares = compls.reduce((s, c) => s + c.valor_final, 0);

        const totalConfrontado = recebimentoPago + totalComplementares;
        const diferenca = totalConfrontado - valorNf;
        const status = classificarStatus(recebimentoPago, diferenca);

        return {
          nf: {
            id: p.id,
            numero: p.numero,
            data: p.data,
            cliente_nome: p.cliente_nome,
            material: p.material,
            peso: num(p.peso),
            valor_final: valorNf,
          },
          recebimentos: recs,
          recebimentoPago,
          complementares: compls,
          totalComplementares,
          totalConfrontado,
          diferenca,
          status,
        };
      });

      const resumo: ResumoConferencia = {
        total: itens.length,
        conferidos: itens.filter((i) => i.status === 'CONFERIDO').length,
        atencao: itens.filter((i) => i.status === 'ATENCAO').length,
        divergentes: itens.filter((i) => i.status === 'DIVERGENTE').length,
        aguardando: itens.filter((i) => i.status === 'AGUARDANDO').length,
        valorNfs: itens.reduce((s, i) => s + i.nf.valor_final, 0),
        valorRecebido: itens.reduce((s, i) => s + i.recebimentoPago, 0),
        valorComplementares: itens.reduce((s, i) => s + i.totalComplementares, 0),
        // diferenca total ignora AGUARDANDO (que tem diferenca = -valor_final mas
        // não foi recebido ainda)
        diferencaTotal: itens
          .filter((i) => i.status !== 'AGUARDANDO')
          .reduce((s, i) => s + i.diferenca, 0),
      };

      return { itens, resumo };
    },
  });
}
