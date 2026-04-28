// Localização da empresa
const EMPRESA_LAT = -16.16548685972958;
const EMPRESA_LNG = -47.925580557671054;
const RAIO_METROS = 2000; // 2 km

// Faixa de IP do provedor da empresa (FlyNet Telecom)
const FAIXA_IP_PERMITIDA = '177.86.';

// Horário comercial
const HORARIO_INICIO = 8;
const HORARIO_FIM = 18;

export interface VerificacaoSeguranca {
  permitido: boolean;
  motivo?: 'horario' | 'ip' | 'localizacao' | 'permissao_negada' | 'erro';
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

// Calcula distância entre 2 coordenadas (Haversine)
function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    console.warn('📡 [Seguranca] não conseguiu obter IP público');
    return { ok: false };
  }

  console.log(`📡 [Seguranca] IP do cliente: ${ip}`);
  const permitido = ip.startsWith(FAIXA_IP_PERMITIDA);
  console.log(`📡 [Seguranca] IP ${permitido ? '✅ FlyNet' : '❌ outro provedor'}`);

  return { ok: permitido, ip };
}

// Verifica localização GPS
export function dentroEmpresa(): Promise<{
  ok: boolean;
  motivo?: VerificacaoSeguranca['motivo'];
  distancia?: number;
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('📍 [Seguranca] geolocalização não disponível');
      resolve({ ok: false, motivo: 'erro' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = distanciaMetros(
          pos.coords.latitude,
          pos.coords.longitude,
          EMPRESA_LAT,
          EMPRESA_LNG,
        );
        const distRound = Math.round(dist);
        console.log(
          `📍 [Seguranca] distância da empresa: ${distRound}m (raio ${RAIO_METROS}m)`,
        );
        const ok = dist <= RAIO_METROS;
        console.log(
          `📍 [Seguranca] localização ${ok ? '✅ dentro da empresa' : '❌ fora da empresa'}`,
        );
        resolve({ ok, motivo: ok ? undefined : 'localizacao', distancia: distRound });
      },
      (err) => {
        console.warn('📍 [Seguranca] erro geolocalização:', err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, motivo: 'permissao_negada' });
        } else {
          resolve({ ok: false, motivo: 'erro' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
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

  // 3. LOCALIZAÇÃO GPS
  const verifGps = await dentroEmpresa();
  if (!verifGps.ok) {
    console.warn(`🚫 [Seguranca] BLOQUEADO: ${verifGps.motivo}`);
    return { permitido: false, motivo: verifGps.motivo };
  }
  console.log('✅ [Seguranca] localização OK');

  console.log('🎉 [Seguranca] TODAS as verificações passaram — acesso liberado');
  return { permitido: true };
}
