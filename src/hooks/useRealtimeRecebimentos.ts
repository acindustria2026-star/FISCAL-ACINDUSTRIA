import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

interface RecPayload {
  id?: string;
  nf_id?: string;
  pago?: boolean;
  criado_por_id?: string | null;
}

export function useRealtimeRecebimentos() {
  const qc = useQueryClient();
  const { perfil, user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!perfil) return;
    const empresaId = perfil.empresa_id;
    const meuId = user?.id;

    const channel = supabase
      .channel(`recs:${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recebimentos',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          const novo = payload.new as RecPayload | undefined;
          const antigo = payload.old as RecPayload | undefined;
          const fezAcao = novo?.criado_por_id === meuId;

          if (!fezAcao) {
            if (payload.eventType === 'INSERT') {
              toast.info('Novo recebimento lançado');
            } else if (payload.eventType === 'UPDATE') {
              if (novo?.pago && antigo?.pago === false) {
                toast.info('Pagamento confirmado');
              } else {
                toast.info('Recebimento atualizado');
              }
            } else if (payload.eventType === 'DELETE') {
              toast.info('Recebimento excluído');
            }
          }

          qc.invalidateQueries({ queryKey: ['recebimentos'] });
          qc.invalidateQueries({ queryKey: ['nfs'] });
          qc.invalidateQueries({ queryKey: ['nfs-em-aberto'] });
          qc.invalidateQueries({ queryKey: ['nfs-sem-recebimento'] });
          qc.invalidateQueries({ queryKey: ['comparativo'] });
          qc.invalidateQueries({ queryKey: ['financeiro'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: ['relatorio-impureza'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [perfil, user?.id, qc, toast]);
}
