// Mapeamento entre "usuário simples" (admin, joao) ↔ email interno (admin@local.app).
// O Supabase Auth exige email; o front esconde isso do usuário final.

const DOMINIO_INTERNO = '@local.app';

export function usuarioParaEmail(usuario: string): string {
  const limpo = usuario.trim().toLowerCase().replace(/\s+/g, '');
  if (!limpo) return '';
  if (limpo.includes('@')) return limpo;
  return `${limpo}${DOMINIO_INTERNO}`;
}

export function emailParaUsuario(email: string | null | undefined): string {
  if (!email) return '';
  if (email.endsWith(DOMINIO_INTERNO)) {
    return email.slice(0, -DOMINIO_INTERNO.length);
  }
  return email;
}

export function validarUsuario(usuario: string): string | null {
  const limpo = usuario.trim();
  if (!limpo) return 'Informe o nome de usuário';
  if (limpo.length < 3) return 'Mínimo 3 caracteres';
  if (!/^[a-zA-Z0-9._-]+$/.test(limpo)) {
    return 'Use só letras, números, ponto, traço ou underscore';
  }
  return null;
}
