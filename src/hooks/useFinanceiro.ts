import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePeriodo } from '../contexts/PeriodoContext';
import { dataHojeISO } from '../lib/dataUtils';
import type { NotaFiscalRow, RecebimentoRow } from '../types/database';

export type CategoriaFinanceiro = 'pago' | 'aReceber' | 'atrasada';

export interface ItemFinanceiro {
  nf: NotaFiscalRow;
  rec: RecebimentoRow | null;
  categoria: CategoriaFinanceiro;
  semRecebimento: boolean;
  valorAcordado: number;
  valorRealRecebido: number | null;
  diferenca: number | null;
  dataPagamento: string | null;
  diasAtraso: number | null;
  diasParaVencer: number | null;
  diasDesdeEmissao: number;
}

export interface MetricasFinanceiroData {
  totalRecebido: number;
  totalAReceber: number;
  totalAtrasadas: number;
  ticketMedio: number;
  qtdPagas: number;
  qtdAReceber: number;
  qtdAtrasadas: number;
}

export interface FinanceiroData {
  itens: ItemFinanceiro[];
  metricas: MetricasFinanceiroData;
}

const SELECT_QUERY = `*, recebimento:recebimentos!nf_id(*)`;

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function ultimoDiaMes(ano: number, mes: number): string {
  const d = new Date(ano, mes + 1, 0);
  return dataIso(d.getFullYear(), d.getMonth(), d.getDate());
}

function extrairRec(raw: unknown): RecebimentoRow | null {
  if (Array.isArray(raw)) return (raw[0] as RecebimentoRow) ?? null;
  return (raw as RecebimentoRow | null) ?? null;
}

function diferencaDias(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function useFinanceiro() {
  const { mes, ano } = usePeriodo();

  return useQuery<FinanceiroData>({
    queryKey: ['financeiro', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select(SELECT_QUERY)
        .order('data', { ascending: false });

      if (ano !== null && mes !== null) {
        query = query.gte('data', dataIso(ano, mes, 1)).lte('data', ultimoDiaMes(ano, mes));
      } else if (ano !== null) {
        query = query.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const linhas = (data ?? []) as unknown as Array<
        NotaFiscalRow & { recebimento: RecebimentoRow | RecebimentoRow[] | null }
      >;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const itens: ItemFinanceiro[] = linhas
        .filter((l) => l.substituida_em === null)
        .map((linha) => {
          const rec = extrairRec(linha.recebimento);
          const dataNf = new Date(linha.data);
          dataNf.setHours(0, 0, 0, 0);
          const diasDesdeEmissao = diferencaDias(hoje, dataNf);

          let categoria: CategoriaFinanceiro;
          let dataPagamento: string | null = rec?.data_pagamento ?? null;

          if (!rec) {
            categoria = diasDesdeEmissao > 30 ? 'atrasada' : 'aReceber';
          } else if (rec.pago !== false) {
            categoria = 'pago';
          } else if (rec.data_pagamento) {
            const dPag = new Date(rec.data_pagamento);
            dPag.setHours(0, 0, 0, 0);
            categoria = dPag < hoje ? 'atrasada' : 'aReceber';
          } else {
            categoria = 'aReceber';
            dataPagamento = null;
          }

          let diasAtraso: number | null = null;
          let diasParaVencer: number | null = null;

          if (categoria === 'atrasada') {
            if (rec?.data_pagamento) {
              const dPag = new Date(rec.data_pagamento);
              dPag.setHours(0, 0, 0, 0);
              diasAtraso = diferencaDias(hoje, dPag);
            } else {
              diasAtraso = Math.max(diasDesdeEmissao - 30, 0);
            }
          } else if (categoria === 'aReceber' && rec?.data_pagamento) {
            const dPag = new Date(rec.data_pagamento);
            dPag.setHours(0, 0, 0, 0);
            diasParaVencer = diferencaDias(dPag, hoje);
          }

          const valorAcordado = rec ? Number(rec.valor_pago) : Number(linha.valor_final);
          const valorRealRecebido =
            rec?.valor_real_recebido !== null && rec?.valor_real_recebido !== undefined
              ? Number(rec.valor_real_recebido)
              : null;
          const diferenca =
            valorRealRecebido !== null && rec ? valorRealRecebido - Number(rec.valor_pago) : null;

          return {
            nf: linha,
            rec,
            categoria,
            semRecebimento: rec === null,
            valorAcordado,
            valorRealRecebido,
            diferenca,
            dataPagamento,
            diasAtraso,
            diasParaVencer,
            diasDesdeEmissao,
          };
        });

      const totalRecebido = itens
        .filter((i) => i.categoria === 'pago')
        .reduce((s, i) => s + i.valorAcordado, 0);
      const totalAReceber = itens
        .filter((i) => i.categoria === 'aReceber')
        .reduce((s, i) => s + i.valorAcordado, 0);
      const totalAtrasadas = itens
        .filter((i) => i.categoria === 'atrasada')
        .reduce((s, i) => s + i.valorAcordado, 0);
      const qtdPagas = itens.filter((i) => i.categoria === 'pago').length;
      const qtdAReceber = itens.filter((i) => i.categoria === 'aReceber').length;
      const qtdAtrasadas = itens.filter((i) => i.categoria === 'atrasada').length;

      return {
        itens,
        metricas: {
          totalRecebido,
          totalAReceber,
          totalAtrasadas,
          ticketMedio: qtdPagas > 0 ? totalRecebido / qtdPagas : 0,
          qtdPagas,
          qtdAReceber,
          qtdAtrasadas,
        },
      };
    },
  });
}

export function useMarcarPagoPorNf() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (nfId: string) => {
      const { data: rec, error: errRec } = await supabase
        .from('recebimentos')
        .select('id, data_pagamento')
        .eq('nf_id', nfId)
        .maybeSingle();
      if (errRec) throw errRec;
      if (!rec) throw new Error('NF ainda não tem recebimento — lance primeiro');

      const today = dataHojeISO();
      const { error } = await supabase
        .from('recebimentos')
        .update({
          pago: true,
          pago_em: new Date().toISOString(),
          data_pagamento: rec.data_pagamento ?? today,
        })
        .eq('id', rec.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeiro'] });
      qc.invalidateQueries({ queryKey: ['recebimentos'] });
      qc.invalidateQueries({ queryKey: ['nfs'] });
    },
  });
}
