import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePeriodo } from '../contexts/PeriodoContext';
import type { NotaFiscalRow, RecebimentoRow } from '../types/database';

export type StatusComparativo = 'ok' | 'divergente' | 'aguardando';

export interface ClienteCompacto {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
}

export interface ItemComparativo {
  nf: NotaFiscalRow;
  cliente: ClienteCompacto | null;
  rec: RecebimentoRow | null;
  pesoEmitido: number;
  pesoLiquido: number | null;
  difPeso: number | null;
  difPesoPct: number | null;
  valorNegociadoNf: number;
  valorFinalNf: number;
  valorPago: number | null;
  difValor: number | null;
  impostoNf: number;
  status: StatusComparativo;
}

const SELECT_QUERY = `
  *,
  cliente:clientes(id, nome, cnpj, endereco),
  recebimento:recebimentos!nf_id(*)
`;

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function ultimoDiaMes(ano: number, mes: number): string {
  const d = new Date(ano, mes + 1, 0);
  return dataIso(d.getFullYear(), d.getMonth(), d.getDate());
}

function extrairRecebimento(raw: unknown): RecebimentoRow | null {
  if (Array.isArray(raw)) return (raw[0] as RecebimentoRow) ?? null;
  return (raw as RecebimentoRow | null) ?? null;
}

export function useComparativo() {
  const { mes, ano } = usePeriodo();

  return useQuery<ItemComparativo[]>({
    queryKey: ['comparativo', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select(SELECT_QUERY)
        .order('data', { ascending: false })
        .order('numero', { ascending: false });

      if (ano !== null && mes !== null) {
        query = query.gte('data', dataIso(ano, mes, 1)).lte('data', ultimoDiaMes(ano, mes));
      } else if (ano !== null) {
        query = query.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const linhas = (data ?? []) as unknown as Array<
        NotaFiscalRow & {
          cliente: ClienteCompacto | null;
          recebimento: RecebimentoRow | RecebimentoRow[] | null;
        }
      >;

      return linhas.map((linha): ItemComparativo => {
        const rec = extrairRecebimento(linha.recebimento);
        const peso = Number(linha.peso);
        const pesoLiquido = rec ? Number(rec.peso_liquido) : null;
        const difPeso = pesoLiquido !== null ? pesoLiquido - peso : null;
        const difPesoPct = difPeso !== null && peso > 0 ? difPeso / peso : null;

        let status: StatusComparativo;
        if (rec === null) status = 'aguardando';
        else if (difPesoPct !== null && Math.abs(difPesoPct) <= 0.02) status = 'ok';
        else status = 'divergente';

        const valorPago = rec ? Number(rec.valor_pago) : null;
        const valorFinalNf = Number(linha.valor_final);

        return {
          nf: linha,
          cliente: linha.cliente,
          rec,
          pesoEmitido: peso,
          pesoLiquido,
          difPeso,
          difPesoPct,
          valorNegociadoNf: Number(linha.valor_negociado),
          valorFinalNf,
          valorPago,
          difValor: valorPago !== null ? valorPago - valorFinalNf : null,
          impostoNf: Number(linha.total_impostos),
          status,
        };
      });
    },
  });
}
