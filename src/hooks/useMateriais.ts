import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { MaterialRow } from '../types/database';
import type { MaterialInput } from '../schemas/material';

export function useMateriais() {
  return useQuery<MaterialRow[]>({
    queryKey: ['materiais'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materiais').select('*').order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCriarMaterial() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  return useMutation({
    mutationFn: async (dados: MaterialInput) => {
      if (!perfil) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('materiais')
        .insert({ ...dados, empresa_id: perfil.empresa_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materiais'] }),
  });
}

export function useEditarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<MaterialInput> }) => {
      const { data, error } = await supabase
        .from('materiais')
        .update(dados)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materiais'] }),
  });
}

export function useExcluirMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materiais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materiais'] }),
  });
}
