import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { EmpresaRow } from '../types/database';

export function useEmpresa() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresa_id;

  return useQuery<EmpresaRow | null>({
    queryKey: ['empresa', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAtualizarEmpresa() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  const empresaId = perfil?.empresa_id;

  return useMutation({
    mutationFn: async (dados: Partial<EmpresaRow>) => {
      if (!empresaId) throw new Error('Empresa não disponível');
      const { data, error } = await supabase
        .from('empresas')
        .update(dados)
        .eq('id', empresaId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['empresa', empresaId], data);
    },
  });
}
