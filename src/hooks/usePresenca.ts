import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Papel } from '../types/database';

export interface UsuarioOnline {
  id: string;
  nome: string;
  papel: Papel;
  online_em: string;
  presence_ref?: string;
}

export function usePresenca() {
  const { perfil } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioOnline[]>([]);

  useEffect(() => {
    if (!perfil) return;

    const channel = supabase.channel(`presence:${perfil.empresa_id}`, {
      config: { presence: { key: perfil.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          (UsuarioOnline & { presence_ref: string })[]
        >;
        // Pega a entrada mais recente por usuário (caso múltiplas sessões)
        const unicos: UsuarioOnline[] = Object.entries(state).map(([, sessoes]) => {
          return sessoes[sessoes.length - 1];
        });
        setUsuarios(unicos);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: perfil.id,
            nome: perfil.nome,
            papel: perfil.papel,
            online_em: new Date().toISOString(),
          });
        }
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [perfil]);

  return usuarios;
}
