import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { PedidoRow } from '../types/database';
import type { PedidoFormParsed } from '../schemas/pedido';

export interface NfDoPedido {
  id: string;
  numero: string;
  data: string;
  peso: number;
  valor_final: number;
  substituida_em: string | null;
}

export interface PedidoComEntregue extends PedidoRow {
  notas_fiscais: NfDoPedido[];
  entregue: number;
  saldo: number;
  qtdNfs: number;
}

export type StatusCalculado =
  | 'concluido'
  | 'pronto-pra-concluir'
  | 'atrasado'
  | 'quase-fechando'
  | 'ativo';

export function calcularStatus(p: PedidoComEntregue): StatusCalculado {
  if (p.status === 'CONCLUIDO') return 'concluido';
  if (p.saldo <= 0) return 'pronto-pra-concluir';
  if (p.prazo && new Date(p.prazo) < new Date()) return 'atrasado';
  const total = Number(p.peso_total);
  if (total > 0 && p.entregue / total >= 0.8) return 'quase-fechando';
  return 'ativo';
}

const SELECT_QUERY = `
  *,
  notas_fiscais!pedido_id(id, numero, data, peso, valor_final, substituida_em)
`;

function normalizar(raw: PedidoRow & { notas_fiscais: NfDoPedido[] | null }): PedidoComEntregue {
  const nfs = (raw.notas_fiscais ?? []).filter((n) => n.substituida_em === null);
  const entregue = nfs.reduce((s, n) => s + Number(n.peso), 0);
  const total = Number(raw.peso_total);
  return {
    ...raw,
    notas_fiscais: nfs,
    entregue,
    saldo: total - entregue,
    qtdNfs: nfs.length,
  };
}

export function usePedidos() {
  return useQuery<PedidoComEntregue[]>({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(SELECT_QUERY)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const linhas = (data ?? []) as unknown as Array<
        PedidoRow & { notas_fiscais: NfDoPedido[] | null }
      >;
      return linhas.map(normalizar);
    },
  });
}

export function usePedido(id: string | null) {
  return useQuery<PedidoComEntregue | null>({
    queryKey: ['pedido', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(SELECT_QUERY)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return normalizar(data as unknown as PedidoRow & { notas_fiscais: NfDoPedido[] | null });
    },
  });
}

/** Pedidos ATIVOS de um cliente, com saldo > 0 */
export function usePedidosAtivosDoCliente(clienteId: string | null | undefined) {
  const lista = usePedidos();
  return useMemo(() => {
    if (!clienteId || !lista.data) return [];
    return lista.data.filter(
      (p) => p.cliente_id === clienteId && p.status === 'ATIVO' && p.saldo > 0,
    );
  }, [clienteId, lista.data]);
}

function autoNumero(): string {
  return `PED-${Date.now().toString().slice(-6)}`;
}

function traduzirErro(err: { code?: string; message: string }): Error {
  if (err.code === '23505') return new Error('Já existe pedido com esse número');
  return new Error(err.message);
}

export function useCriarPedido() {
  const qc = useQueryClient();
  const { perfil } = useAuth();

  return useMutation({
    mutationFn: async (dados: PedidoFormParsed) => {
      if (!perfil) throw new Error('Não autenticado');
      const numero = (dados.numero?.trim() || autoNumero());

      const { data, error } = await supabase
        .from('pedidos')
        .insert({
          numero,
          cliente_id: dados.cliente_id,
          cliente_nome: dados.cliente_nome,
          material: dados.material?.trim() || null,
          peso_total: dados.peso_total,
          preco_referencia: dados.preco_referencia,
          data_inicio: dados.data_inicio,
          prazo: dados.prazo,
          observacoes: dados.observacoes?.trim() || null,
          empresa_id: perfil.empresa_id,
          criado_por_id: perfil.id,
        })
        .select()
        .single();
      if (error) throw traduzirErro(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useEditarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: PedidoFormParsed }) => {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          numero: dados.numero?.trim() || undefined,
          cliente_id: dados.cliente_id,
          cliente_nome: dados.cliente_nome,
          material: dados.material?.trim() || null,
          peso_total: dados.peso_total,
          preco_referencia: dados.preco_referencia,
          data_inicio: dados.data_inicio,
          prazo: dados.prazo,
          observacoes: dados.observacoes?.trim() || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw traduzirErro(error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
    },
  });
}

export function useConcluirPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'CONCLUIDO', concluido_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useReabrirPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'ATIVO', concluido_em: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useExcluirPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('notas_fiscais')
        .select('id', { count: 'exact', head: true })
        .eq('pedido_id', id);
      if ((count ?? 0) > 0) {
        throw new Error('Não é possível excluir — existem NFs vinculadas a este pedido');
      }
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}
