import { supabase } from './supabase';

export async function reverterResolucao(nfId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('notas_fiscais')
    .update({
      resolvido: false,
      resolvido_motivo: null,
      resolvido_por: null,
      resolvido_em: null,
      resolvido_nf_compl: null,
    })
    .eq('id', nfId);
  return { error: error?.message };
}
