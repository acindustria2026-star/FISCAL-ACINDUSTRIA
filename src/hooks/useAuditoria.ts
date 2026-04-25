import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AcaoAuditoria, AuditoriaRow, Papel } from '../types/database';

export interface FiltrosAuditoria {
  usuario_id?: string | null;
  acao?: AcaoAuditoria | null;
  recurso?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  limit?: number;
}

export interface AuditoriaItem extends AuditoriaRow {
  perfil: { nome: string; email: string; papel: Papel } | null;
}

export function useAuditoria(filtros: FiltrosAuditoria) {
  return useQuery<AuditoriaItem[]>({
    queryKey: ['auditoria', filtros],
    queryFn: async () => {
      let query = supabase
        .from('auditoria')
        .select('*, perfil:perfis!usuario_id(nome, email, papel)')
        .order('created_at', { ascending: false })
        .limit(filtros.limit ?? 200);

      if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id);
      if (filtros.acao) query = query.eq('acao', filtros.acao);
      if (filtros.recurso) query = query.eq('recurso', filtros.recurso);
      if (filtros.dataInicio) query = query.gte('created_at', filtros.dataInicio);
      if (filtros.dataFim) query = query.lte('created_at', filtros.dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AuditoriaItem[];
    },
  });
}

