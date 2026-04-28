const EMPRESA_LAT = -16.16548685972958;
const EMPRESA_LNG = -47.925580557671054;
const RAIO_METROS = 500;
const HORARIO_INICIO = 8;
const HORARIO_FIM = 18;

export interface VerificacaoSeguranca {
  permitido: boolean;
  motivo?: 'horario' | 'localizacao' | 'permissao_negada' | 'erro';
}

export function dentroHorarioComercial(): boolean {
  const agora = new Date();
  const dia = agora.getDay();
  const hora = agora.getHours();

  if (dia === 0 || dia === 6) return false;
  if (hora < HORARIO_INICIO || hora >= HORARIO_FIM) return false;

  return true;
}

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

export function dentroEmpresa(): Promise<{ ok: boolean; motivo?: VerificacaoSeguranca['motivo'] }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
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
        console.log('📍 [Seguranca] distância da empresa:', Math.round(dist), 'metros');
        resolve({
          ok: dist <= RAIO_METROS,
          motivo: dist <= RAIO_METROS ? undefined : 'localizacao',
        });
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

export async function verificarAcesso(papel: string): Promise<VerificacaoSeguranca> {
  if (papel === 'ADMIN') {
    return { permitido: true };
  }

  if (!dentroHorarioComercial()) {
    return { permitido: false, motivo: 'horario' };
  }

  const local = await dentroEmpresa();
  if (!local.ok) {
    return { permitido: false, motivo: local.motivo };
  }

  return { permitido: true };
}
