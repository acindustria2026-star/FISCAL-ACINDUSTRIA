import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePeriodo } from '../contexts/PeriodoContext';
import type { NotaFiscalRow, RecebimentoRow } from '../types/database';

export interface RecebimentoComNf extends RecebimentoRow {
  nf:
    | (NotaFiscalRow & {
        cliente: { id: string; nome: string } | null;
      })
    | null;
}

export interface NfSemRecebimento extends NotaFiscalRow {
  recebimento: { id: string }[];
}

interface RecebimentoPayload {
  nf_id: string;
  data_recebimento: string;
  peso_bruto: number;
  impureza_kg: number;
  pago: boolean;
  data_pagamento: string | null;
  valor_real_recebido: number | null;
  observacoes: string | null;
}

const SELECT_QUERY = `
  *,
  nf:notas_fiscais!nf_id(*, cliente:clientes(id, nome))
`;

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function ultimoDiaMes(ano: number, mes: number): string {
  const d = new Date(ano, mes + 1, 0);
  return dataIso(d.getFullYear(), d.getMonth(), d.getDate());
}

export function useRecebimentos() {
  const { mes, ano } = usePeriodo();

  return useQuery<RecebimentoComNf[]>({
    queryKey: ['recebimentos', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('recebimentos')
        .select(SELECT_QUERY)
        .order('data_recebimento', { ascending: false });

      if (ano !== null && mes !== null) {
        query = query
          .gte('data_recebimento', dataIso(ano, mes, 1))
          .lte('data_recebimento', ultimoDiaMes(ano, mes));
      } else if (ano !== null) {
        query = query
          .gte('data_recebimento', `${ano}-01-01`)
          .lte('data_recebimento', `${ano}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as RecebimentoComNf[];
    },
  });
}

export function useNfsSemRecebimento() {
  return useQuery<NfSemRecebimento[]>({
    queryKey: ['nfs-sem-recebimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*, recebimento:recebimentos!nf_id(id)')
        .order('data', { ascending: false });
      if (error) throw error;
      const all = (data ?? []) as unknown as NfSemRecebimento[];
      return all.filter((nf) => (nf.recebimento?.length ?? 0) === 0);
    },
  });
}

function calcularRecebimento(args: {
  pesoBruto: number;
  impurezaKg: number;
  precoFinalKg: number;
}) {
  const pesoLiquido = Math.max(args.pesoBruto - args.impurezaKg, 0);
  const impurezaPct = args.pesoBruto > 0 ? args.impurezaKg / args.pesoBruto : 0;
  const valorPago = pesoLiquido * args.precoFinalKg;
  return {
    peso_liquido: Math.round(pesoLiquido * 1000) / 1000,
    impureza_pct: Math.round(impurezaPct * 10000) / 10000,
    valor_pago: Math.round(valorPago * 100) / 100,
  };
}

function traduzirErro(err: { code?: string; message: string }): Error {
  if (err.code === '23505') return new Error('Esta NF já tem recebimento');
  return new Error(err.message);
}

export function useCriarRecebimento() {
  const qc = useQueryClient();
  const { perfil } = useAuth();

  return useMutation({
    mutationFn: async (dados: RecebimentoPayload) => {
      if (!perfil) throw new Error('Não autenticado');

      const { data: nf, error: errNf } = await supabase
        .from('notas_fiscais')
        .select('preco_final_kg')
        .eq('id', dados.nf_id)
        .maybeSingle();
      if (errNf) throw errNf;
      if (!nf) throw new Error('NF não encontrada');

      const calc = calcularRecebimento({
        pesoBruto: dados.peso_bruto,
        impurezaKg: dados.impureza_kg,
        precoFinalKg: Number(nf.preco_final_kg ?? 0),
      });

      const { data, error } = await supabase
        .from('recebimentos')
        .insert({
          nf_id: dados.nf_id,
          empresa_id: perfil.empresa_id,
          criado_por_id: perfil.id,
          data_recebimento: dados.data_recebimento,
          peso_bruto: dados.peso_bruto,
          impureza_kg: dados.impureza_kg,
          peso_liquido: calc.peso_liquido,
          impureza_pct: calc.impureza_pct,
          valor_pago: calc.valor_pago,
          pago: dados.pago,
          data_pagamento: dados.pago ? dados.data_pagamento : null,
          valor_real_recebido: dados.pago ? dados.valor_real_recebido : null,
          pago_em: dados.pago ? new Date().toISOString() : null,
          observacoes: dados.observacoes,
        })
        .select()
        .single();

      if (error) throw traduzirErro(error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recebimentos'] });
      qc.invalidateQueries({ queryKey: ['nfs'] });
      qc.invalidateQueries({ queryKey: ['nfs-sem-recebimento'] });
    },
  });
}

export function useEditarRecebimento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dados,
      precoFinalKg,
      pagoAnterior,
    }: {
      id: string;
      dados: RecebimentoPayload;
      precoFinalKg: number;
      pagoAnterior: boolean;
    }) => {
      const calc = calcularRecebimento({
        pesoBruto: dados.peso_bruto,
        impurezaKg: dados.impureza_kg,
        precoFinalKg,
      });

      const update: Partial<RecebimentoRow> = {
        data_recebimento: dados.data_recebimento,
        peso_bruto: dados.peso_bruto,
        impureza_kg: dados.impureza_kg,
        peso_liquido: calc.peso_liquido,
        impureza_pct: calc.impureza_pct,
        valor_pago: calc.valor_pago,
        pago: dados.pago,
        data_pagamento: dados.pago ? dados.data_pagamento : null,
        valor_real_recebido: dados.pago ? dados.valor_real_recebido : null,
        observacoes: dados.observacoes,
      };

      if (dados.pago && !pagoAnterior) {
        update.pago_em = new Date().toISOString();
      } else if (!dados.pago) {
        update.pago_em = null;
      }

      const { data, error } = await supabase
        .from('recebimentos')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw traduzirErro(error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recebimentos'] });
      qc.invalidateQueries({ queryKey: ['nfs'] });
    },
  });
}

export function useExcluirRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recebimentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recebimentos'] });
      qc.invalidateQueries({ queryKey: ['nfs'] });
      qc.invalidateQueries({ queryKey: ['nfs-sem-recebimento'] });
    },
  });
}

export function useMarcarPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data_pagamento,
      valor_real_recebido,
    }: {
      id: string;
      data_pagamento: string;
      valor_real_recebido?: number | null;
    }) => {
      const { data, error } = await supabase
        .from('recebimentos')
        .update({
          pago: true,
          data_pagamento,
          valor_real_recebido: valor_real_recebido ?? null,
          pago_em: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recebimentos'] });
      qc.invalidateQueries({ queryKey: ['nfs'] });
    },
  });
}
