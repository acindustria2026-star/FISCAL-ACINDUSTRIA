import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePeriodo } from '../contexts/PeriodoContext';
import { calcularImpostos } from '../utils/calculos';
import type {
  MotivoComplementar,
  NotaFiscalRow,
  RecebimentoRow,
  TipoFrete,
} from '../types/database';

export interface NfPayload {
  numero: string;
  data: string;
  cliente_id: string | null;
  cliente_nome: string;
  material: string | null;
  peso: number;
  preco_negociado: number;
  icms_ativo: boolean;
  piscofins_ativo: boolean;
  icms_pct: number;
  pis_pct: number;
  cofins_pct: number;
  tipo_frete: TipoFrete | null;
  transportadora: string | null;
  placa_veiculo: string | null;
  motorista: string | null;
  pedido_id: string | null;
  pedido_numero: string | null;
  observacoes: string | null;
  nf_pai_id: string | null;
  nf_pai_numero: string | null;
  motivo_complementar: MotivoComplementar | null;
}

export interface NfComRelacoes extends NotaFiscalRow {
  cliente: { id: string; nome: string } | null;
  nf_pai: { id: string; numero: string } | null;
  nfs_filhas: { count: number }[];
  recebimento: RecebimentoRow | null;
  criado_por: { nome: string } | null;
  editado_por: { nome: string } | null;
}

const SELECT_QUERY = `
  *,
  cliente:clientes(id, nome),
  nf_pai:notas_fiscais!nf_pai_id(id, numero),
  nfs_filhas:notas_fiscais!nf_pai_id(count),
  recebimento:recebimentos!nf_id(*),
  criado_por:perfis!criado_por_id(nome),
  editado_por:perfis!editado_por_id(nome)
`;

function ultimoDiaDoMes(ano: number, mes: number): string {
  const d = new Date(ano, mes + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function useNfs() {
  const { mes, ano } = usePeriodo();

  return useQuery<NfComRelacoes[]>({
    queryKey: ['nfs', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select(SELECT_QUERY)
        .order('data', { ascending: false })
        .order('numero', { ascending: false });

      if (ano !== null && mes !== null) {
        query = query.gte('data', dataIso(ano, mes, 1)).lte('data', ultimoDiaDoMes(ano, mes));
      } else if (ano !== null) {
        query = query.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as NfComRelacoes[];
    },
  });
}

export function useNf(id: string | null) {
  return useQuery<NfComRelacoes | null>({
    queryKey: ['nf', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(SELECT_QUERY)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as NfComRelacoes | null;
    },
  });
}

export function useNfsFilhas(paiId: string | null) {
  return useQuery<NotaFiscalRow[]>({
    queryKey: ['nfs-filhas', paiId],
    enabled: !!paiId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('nf_pai_id', paiId!)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function aplicarCalculo(p: NfPayload) {
  const calc = calcularImpostos({
    peso: p.peso,
    precoNegociado: p.preco_negociado,
    icmsAtivo: p.icms_ativo,
    piscofinsAtivo: p.piscofins_ativo,
    icmsPct: p.icms_pct,
    pisPct: p.pis_pct,
    cofinsPct: p.cofins_pct,
  });
  return {
    valor_negociado: calc.valorNegociado,
    valor_final: calc.valorFinal,
    icms: calc.icms,
    pis: calc.pis,
    cofins: calc.cofins,
    total_impostos: calc.totalImpostos,
    preco_final_kg: calc.precoFinalKg,
  };
}

function traduzirErroSupabase(err: { code?: string; message: string }): Error {
  if (err.code === '23505') return new Error('Já existe NF com esse número');
  return new Error(err.message);
}

export function useCriarNf() {
  const qc = useQueryClient();
  const { perfil } = useAuth();

  return useMutation({
    mutationFn: async (dados: NfPayload) => {
      if (!perfil) throw new Error('Não autenticado');
      const calc = aplicarCalculo(dados);
      const { data, error } = await supabase
        .from('notas_fiscais')
        .insert({
          ...dados,
          ...calc,
          empresa_id: perfil.empresa_id,
          criado_por_id: perfil.id,
        })
        .select()
        .single();
      if (error) throw traduzirErroSupabase(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfs'] }),
  });
}

export function useEditarNf() {
  const qc = useQueryClient();
  const { perfil } = useAuth();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: NfPayload }) => {
      const calc = aplicarCalculo(dados);
      const { data, error } = await supabase
        .from('notas_fiscais')
        .update({
          ...dados,
          ...calc,
          editado_por_id: perfil?.id ?? null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw traduzirErroSupabase(error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['nfs'] });
      qc.invalidateQueries({ queryKey: ['nf', vars.id] });
    },
  });
}

export function useSubstituirNf() {
  const qc = useQueryClient();
  const { perfil } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      dados,
      motivo,
    }: {
      id: string;
      dados: NfPayload;
      motivo: MotivoComplementar;
    }) => {
      const calc = aplicarCalculo(dados);
      const { data, error } = await supabase
        .from('notas_fiscais')
        .update({
          ...dados,
          ...calc,
          editado_por_id: perfil?.id ?? null,
          substituida_em: new Date().toISOString(),
          motivo_substituicao: motivo,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw traduzirErroSupabase(error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['nfs'] });
      qc.invalidateQueries({ queryKey: ['nf', vars.id] });
    },
  });
}

export function useExcluirNf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('notas_fiscais')
        .select('id', { count: 'exact', head: true })
        .eq('nf_pai_id', id);
      if ((count ?? 0) > 0) {
        throw new Error('Não é possível excluir — existem NFs complementares vinculadas');
      }
      const { error } = await supabase.from('notas_fiscais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfs'] }),
  });
}
