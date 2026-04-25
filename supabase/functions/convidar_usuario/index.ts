// Edge Function: convidar_usuario
//
// Cria um novo usuário com senha temporária. NÃO envia email — admin recebe a
// senha gerada e passa pro funcionário, que pode trocar pela tela de Trocar Senha.
//
// Deploy:
//   supabase login
//   supabase link --project-ref <PROJECT_REF>
//   supabase functions deploy convidar_usuario --no-verify-jwt
//
// Secrets configuradas no Dashboard (Edge Functions → convidar_usuario):
//   (SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY já vêm setadas)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAPEIS_VALIDOS = ['ADMIN', 'OPERADOR', 'FINANCEIRO'] as const;
const LIMITE_USUARIOS_ATIVOS = 10;
const DOMINIO_INTERNO = '@local.app';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function gerarSenhaTemp(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '23456789';
  const especiais = '!@#$%';
  const todos = letras + numeros + especiais;
  const escolha = (n: number, set: string) => {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => set[b % set.length]).join('');
  };
  // 8 chars aleatórios + 1 maiúscula garantida + 1 dígito + 1 especial = 11 chars
  return (
    escolha(8, todos) +
    escolha(1, 'ABCDEFGHJKLMNPQRSTUVWXYZ') +
    escolha(1, numeros) +
    escolha(1, especiais)
  );
}

function usuarioParaEmail(usuario: string): string {
  const limpo = usuario.trim().toLowerCase().replace(/\s+/g, '');
  if (limpo.includes('@')) return limpo;
  return `${limpo}${DOMINIO_INTERNO}`;
}

function validarUsuario(usuario: string): string | null {
  const limpo = usuario.trim();
  if (!limpo) return 'Usuário obrigatório';
  if (limpo.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'Formato inválido';
    return null;
  }
  if (limpo.length < 3) return 'Mínimo 3 caracteres';
  if (!/^[a-zA-Z0-9._-]+$/.test(limpo)) {
    return 'Use só letras, números, ponto, traço ou underscore';
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: 'Variáveis de ambiente faltando' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Não autenticado' }, 401);

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return jsonResponse({ error: 'Não autenticado' }, 401);

    const { data: perfilChamador, error: errPerfil } = await supabaseUser
      .from('perfis')
      .select('papel, empresa_id, nome')
      .eq('id', user.id)
      .maybeSingle();

    if (errPerfil) return jsonResponse({ error: errPerfil.message }, 500);
    if (!perfilChamador) return jsonResponse({ error: 'Perfil não encontrado' }, 403);
    if (perfilChamador.papel !== 'ADMIN') {
      return jsonResponse({ error: 'Apenas admins podem convidar usuários' }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: 'Body inválido' }, 400);

    const nome = String(body.nome ?? '').trim();
    const usuarioRaw = String(body.usuario ?? '').trim();
    const papel = String(body.papel ?? '');

    if (nome.length < 2) return jsonResponse({ error: 'Nome inválido' }, 400);
    const erroUsuario = validarUsuario(usuarioRaw);
    if (erroUsuario) return jsonResponse({ error: erroUsuario }, 400);
    if (!PAPEIS_VALIDOS.includes(papel as (typeof PAPEIS_VALIDOS)[number])) {
      return jsonResponse({ error: 'Papel inválido' }, 400);
    }

    const usuario = usuarioRaw.toLowerCase();
    const email = usuarioParaEmail(usuario);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verifica limite de ativos
    const { count } = await supabaseAdmin
      .from('perfis')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', perfilChamador.empresa_id)
      .eq('ativo', true);

    if ((count ?? 0) >= LIMITE_USUARIOS_ATIVOS) {
      return jsonResponse(
        { error: `Limite de ${LIMITE_USUARIOS_ATIVOS} usuários ativos atingido` },
        400,
      );
    }

    // Cria usuário direto com senha temporária (sem enviar email)
    const senhaTemp = gerarSenhaTemp();
    const { data: novoUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senhaTemp,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createErr) {
      const msg = createErr.message.includes('already registered')
        ? 'Usuário já existe'
        : createErr.message;
      return jsonResponse({ error: msg }, 400);
    }
    if (!novoUser?.user) {
      return jsonResponse({ error: 'Falha ao criar usuário no Auth' }, 500);
    }

    // Cria perfil vinculado
    const { error: perfilError } = await supabaseAdmin.from('perfis').insert({
      id: novoUser.user.id,
      empresa_id: perfilChamador.empresa_id,
      nome,
      email,
      papel,
      ativo: true,
    });

    if (perfilError) {
      // Rollback: remove o auth.user
      await supabaseAdmin.auth.admin.deleteUser(novoUser.user.id);
      return jsonResponse({ error: perfilError.message }, 400);
    }

    return jsonResponse({
      ok: true,
      usuario,
      senha_temporaria: senhaTemp,
      mensagem: `Usuário @${usuario} criado. Anote a senha e passe pro funcionário.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: msg }, 500);
  }
});
