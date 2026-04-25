import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

interface NfPayload {
  id?: string;
  numero?: string;
  cliente_nome?: string;
  criado_por_id?: string | null;
  editado_por_id?: string | null;
}

export function useRealtimeNFs() {
  const qc = useQueryClient();
  const { perfil, user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!perfil) return;
    const empresaId = perfil.empresa_id;
    const meuId = user?.id;

    const channel = supabase
      .channel(`nfs:${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notas_fiscais',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          const novo = payload.new as NfPayload | undefined;
          const antigo = payload.old as NfPayload | undefined;
          const fezAcao =
            novo?.criado_por_id === meuId || novo?.editado_por_id === meuId;

          if (!fezAcao) {
            if (payload.eventType === 'INSERT' && novo?.numero) {
              toast.info(`Nova NF ${novo.numero}${novo.cliente_nome ? ` · ${novo.cliente_nome}` : ''}`);
            } else if (payload.eventType === 'UPDATE' && novo?.numero) {
              toast.info(`NF ${novo.numero} atualizada`);
            } else if (payload.eventType === 'DELETE' && antigo?.numero) {
              toast.info(`NF ${antigo.numero} excluída`);
            }
          }

          qc.invalidateQueries({ queryKey: ['nfs'] });
          qc.invalidateQueries({ queryKey: ['nfs-em-aberto'] });
          qc.invalidateQueries({ queryKey: ['nfs-sem-recebimento'] });
          qc.invalidateQueries({ queryKey: ['comparativo'] });
          qc.invalidateQueries({ queryKey: ['financeiro'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: ['relatorio-impureza'] });
          qc.invalidateQueries({ queryKey: ['pedidos'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [perfil, user?.id, qc, toast]);
}
