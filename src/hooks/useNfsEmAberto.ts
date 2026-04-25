import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePeriodo } from '../contexts/PeriodoContext';
import type { NotaFiscalRow } from '../types/database';

export interface NfEmAberto extends NotaFiscalRow {
  recebimento: { id: string }[] | { id: string } | null;
}

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function ultimoDiaMes(ano: number, mes: number): string {
  const d = new Date(ano, mes + 1, 0);
  return dataIso(d.getFullYear(), d.getMonth(), d.getDate());
}

function temRecebimento(rec: NfEmAberto['recebimento']): boolean {
  if (!rec) return false;
  if (Array.isArray(rec)) return rec.length > 0;
  return true;
}

export function useNfsEmAberto() {
  const { mes, ano } = usePeriodo();

  return useQuery<NotaFiscalRow[]>({
    queryKey: ['nfs-em-aberto', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select('*, recebimento:recebimentos!nf_id(id)')
        .order('data', { ascending: true });

      if (ano !== null && mes !== null) {
        query = query.gte('data', dataIso(ano, mes, 1)).lte('data', ultimoDiaMes(ano, mes));
      } else if (ano !== null) {
        query = query.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const linhas = (data ?? []) as unknown as NfEmAberto[];
      return linhas
        .filter((nf) => nf.substituida_em === null)
        .filter((nf) => !temRecebimento(nf.recebimento));
    },
  });
}
