import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

interface PedidoPayload {
  id?: string;
  numero?: string;
  cliente_nome?: string;
  status?: 'ATIVO' | 'CONCLUIDO';
  criado_por_id?: string | null;
}

export function useRealtimePedidos() {
  const qc = useQueryClient();
  const { perfil, user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!perfil) return;
    const empresaId = perfil.empresa_id;
    const meuId = user?.id;

    const channel = supabase
      .channel(`peds:${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          const novo = payload.new as PedidoPayload | undefined;
          const antigo = payload.old as PedidoPayload | undefined;
          const fezAcao = novo?.criado_por_id === meuId;

          if (!fezAcao) {
            if (payload.eventType === 'INSERT' && novo?.numero) {
              toast.info(`Novo pedido ${novo.numero}`);
            } else if (payload.eventType === 'UPDATE' && novo?.numero) {
              if (novo.status === 'CONCLUIDO' && antigo?.status !== 'CONCLUIDO') {
                toast.info(`Pedido ${novo.numero} concluído`);
              } else {
                toast.info(`Pedido ${novo.numero} atualizado`);
              }
            }
          }

          qc.invalidateQueries({ queryKey: ['pedidos'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [perfil, user?.id, qc, toast]);
}
