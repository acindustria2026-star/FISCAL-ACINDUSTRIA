// Faixa de IP do provedor da empresa (FlyNet Telecom)
const FAIXA_IP_PERMITIDA = '177.86.';

// Horário comercial
const HORARIO_INICIO = 8;
const HORARIO_FIM = 18;

export interface VerificacaoSeguranca {
  permitido: boolean;
  motivo?: 'horario' | 'ip' | 'erro';
}

// Verifica horário comercial
export function dentroHorarioComercial(): boolean {
  const agora = new Date();
  const dia = agora.getDay();
  const hora = agora.getHours();

  if (dia === 0 || dia === 6) return false;
  if (hora < HORARIO_INICIO || hora >= HORARIO_FIM) return false;

  return true;
}

// Busca IP público do cliente
async function obterIpPublico(): Promise<string | null> {
  const apis = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipv4.icanhazip.com',
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(api, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const text = await response.text();
      let ip: string;
      try {
        const json = JSON.parse(text);
        ip = json.ip;
      } catch {
        ip = text.trim();
      }

      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        return ip;
      }
    } catch (err) {
      console.warn(`📡 [Seguranca] API ${api} falhou:`, err);
    }
  }

  return null;
}

// Verifica IP
export async function ipDaEmpresa(): Promise<{ ok: boolean; ip?: string }> {
  const ip = await obterIpPublico();

  if (!ip) {
    console.warn('📡 [Seguranca] não conseguiu obter IP público — assumindo OK por tolerancia');
    return { ok: true }; // tolera erro de internet pra não deslogar usuário legítimo
  }

  console.log(`📡 [Seguranca] IP do cliente: ${ip}`);
  const permitido = ip.startsWith(FAIXA_IP_PERMITIDA);
  console.log(
    `📡 [Seguranca] IP ${permitido ? '✅ FlyNet (permitido)' : '❌ outro provedor (bloqueado)'}`,
  );

  return { ok: permitido, ip };
}

// Verifica TUDO de acordo com o papel
export async function verificarAcesso(papel: string): Promise<VerificacaoSeguranca> {
  // ADMIN: sem restrição
  if (papel === 'ADMIN') {
    console.log('👑 [Seguranca] ADMIN — acesso liberado sem verificação');
    return { permitido: true };
  }

  console.log(`🔐 [Seguranca] verificando acesso para ${papel}...`);

  // 1. HORÁRIO
  if (!dentroHorarioComercial()) {
    console.warn('🚫 [Seguranca] BLOQUEADO: fora do horário comercial');
    return { permitido: false, motivo: 'horario' };
  }
  console.log('✅ [Seguranca] horário OK');

  // 2. IP (FlyNet)
  const verifIp = await ipDaEmpresa();
  if (!verifIp.ok) {
    console.warn('🚫 [Seguranca] BLOQUEADO: IP não é FlyNet');
    return { permitido: false, motivo: 'ip' };
  }
  console.log('✅ [Seguranca] IP OK (FlyNet)');

  console.log('🎉 [Seguranca] TODAS as verificações passaram — acesso liberado');
  return { permitido: true };
}
