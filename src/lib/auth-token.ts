/**
 * Firma y verificación del token de sesión. Solo Web Crypto y sin tocar la
 * base, para que el proxy lo pueda usar sin cargar nada más.
 *
 * Token: "<vence>.<version>.<firma>". La versión sube cuando se cambia la
 * clave del admin, y así se cierran todas las sesiones abiertas; el proxy no
 * la comprueba (no tiene base), pero `exigirSesion` sí.
 */

export const COOKIE_SESION = "bacano_admin";

/** Cuánto dura una sesión, en segundos: 30 días. */
export const DURACION_SESION = 30 * 24 * 60 * 60;

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Falta SESSION_SECRET en el entorno (mínimo 16 caracteres).");
  }
  return s;
}

async function firmar(texto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign(
    "HMAC",
    clave,
    new TextEncoder().encode(texto),
  );
  return Buffer.from(firma).toString("base64url");
}

export function igualesEnTiempoConstante(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

export async function crearToken(version: string): Promise<string> {
  const vence = String(Math.floor(Date.now() / 1000) + DURACION_SESION);
  return `${vence}.${version}.${await firmar(`${vence}.${version}`)}`;
}

/** Firma y vencimiento; si se pasa `version`, también tiene que coincidir. */
export async function tokenValido(
  token: string | undefined,
  version?: string,
): Promise<boolean> {
  if (!token) return false;
  const [vence, ver, firma] = token.split(".");
  if (!vence || !ver || !firma) return false;
  if (Number(vence) < Date.now() / 1000) return false;
  if (version !== undefined && ver !== version) return false;
  try {
    return igualesEnTiempoConstante(await firmar(`${vence}.${ver}`), firma);
  } catch {
    return false;
  }
}
