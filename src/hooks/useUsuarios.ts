import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Papel, PerfilRow } from '../types/database';

export function useUsuarios() {
  return useQuery<PerfilRow[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface ConvidarPayload {
  nome: string;
  usuario: string;
  papel: Papel;
}

export interface ConvidarResposta {
  ok: boolean;
  usuario: string;
  senha_temporaria: string;
  mensagem?: string;
}

export function useConvidarUsuario() {
  const qc = useQueryClient();
  return useMutation<ConvidarResposta, Error, ConvidarPayload>({
    mutationFn: async (dados: ConvidarPayload) => {
      const { data, error } = await supabase.functions.invoke('convidar_usuario', {
        body: dados,
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error ?? error.message;
        throw new Error(msg);
      }
      const resp = data as Partial<ConvidarResposta> & { error?: string };
      if (resp?.error) throw new Error(resp.error);
      if (!resp?.ok || !resp.usuario || !resp.senha_temporaria) {
        throw new Error('Resposta inválida do servidor');
      }
      return resp as ConvidarResposta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<PerfilRow> }) => {
      const { data, error } = await supabase
        .from('perfis')
        .update(dados)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
