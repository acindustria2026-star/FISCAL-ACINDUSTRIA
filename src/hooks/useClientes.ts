import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ClienteRow } from '../types/database';
import type { ClienteInput } from '../schemas/cliente';

export function useClientes() {
  return useQuery<ClienteRow[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContagemNFsCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ['cliente-counts', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const [nfs, pedidos] = await Promise.all([
        supabase
          .from('notas_fiscais')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', clienteId!),
        supabase
          .from('pedidos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', clienteId!),
      ]);
      return {
        nfs: nfs.count ?? 0,
        pedidos: pedidos.count ?? 0,
      };
    },
  });
}

export function useCriarCliente() {
  const qc = useQueryClient();
  const { perfil } = useAuth();

  return useMutation({
    mutationFn: async (dados: ClienteInput) => {
      if (!perfil) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome: dados.nome,
          cnpj: dados.cnpj,
          email: dados.email,
          telefone: dados.telefone,
          endereco: dados.endereco,
          observacoes: dados.observacoes,
          empresa_id: perfil.empresa_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

export function useEditarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<ClienteInput> }) => {
      const { data, error } = await supabase
        .from('clientes')
        .update({
          nome: dados.nome,
          cnpj: dados.cnpj,
          email: dados.email,
          telefone: dados.telefone,
          endereco: dados.endereco,
          observacoes: dados.observacoes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

export function useExcluirCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const [{ count: nfs }, { count: pedidos }] = await Promise.all([
        supabase
          .from('notas_fiscais')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', id),
        supabase
          .from('pedidos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', id),
      ]);
      if ((nfs ?? 0) > 0) throw new Error('Cliente possui notas fiscais vinculadas');
      if ((pedidos ?? 0) > 0) throw new Error('Cliente possui pedidos vinculados');

      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}
