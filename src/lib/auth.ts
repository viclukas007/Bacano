import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prepararBase, sql } from "@/lib/db";
import {
  COOKIE_SESION,
  crearToken,
  DURACION_SESION,
  igualesEnTiempoConstante,
  tokenValido,
} from "@/lib/auth-token";

/**
 * Acceso al admin.
 *
 * Hay un solo administrador. Su clave se guarda con hash en `ajustes`; si
 * todavía no hay ninguna guardada, vale la de `ADMIN_PASSWORD` (la clave
 * inicial). Al entrar se firma una cookie (ver `auth-token.ts`); no se
 * guarda nada por sesión. Cambiar la clave sube la versión de sesión y
 * cierra todas las abiertas.
 */

const scrypt = promisify(scryptCb);

async function ajuste(clave: string): Promise<string | undefined> {
  await prepararBase();
  const [fila] = await sql<{ valor: string }[]>`
    SELECT valor FROM ajustes WHERE clave = ${clave}
  `;
  return fila?.valor;
}

async function guardarAjuste(clave: string, valor: string): Promise<void> {
  await sql`
    INSERT INTO ajustes (clave, valor) VALUES (${clave}, ${valor})
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()
  `;
}

// --- Clave ----------------------------------------------------------------------

/** "scrypt$<sal>$<hash>", todo en hex. */
async function hashear(clave: string): Promise<string> {
  const sal = randomBytes(16).toString("hex");
  const hash = (await scrypt(clave, sal, 64)) as Buffer;
  return `scrypt$${sal}$${hash.toString("hex")}`;
}

async function coincide(clave: string, guardado: string): Promise<boolean> {
  const [, sal, hex] = guardado.split("$");
  if (!sal || !hex) return false;
  const hash = (await scrypt(clave, sal, 64)) as Buffer;
  const esperado = Buffer.from(hex, "hex");
  return hash.length === esperado.length && timingSafeEqual(hash, esperado);
}

/** La clave del admin coincide: la guardada, o la inicial si no hay ninguna. */
export async function claveCorrecta(clave: string): Promise<boolean> {
  const guardada = await ajuste("clave_admin");
  if (guardada) return coincide(clave, guardada);

  const inicial = process.env.ADMIN_PASSWORD;
  if (!inicial) throw new Error("Falta ADMIN_PASSWORD en el entorno.");
  return igualesEnTiempoConstante(clave, inicial);
}

/** Guarda la clave nueva y cierra todas las sesiones, incluida la actual. */
export async function cambiarClave(nueva: string): Promise<void> {
  await guardarAjuste("clave_admin", await hashear(nueva));
  await guardarAjuste("version_sesion", randomBytes(6).toString("hex"));
}

// --- Sesión ---------------------------------------------------------------------

async function versionSesion(): Promise<string> {
  return (await ajuste("version_sesion")) ?? "1";
}

export async function iniciarSesion(): Promise<void> {
  (await cookies()).set(COOKIE_SESION, await crearToken(await versionSesion()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION,
  });
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}

export async function haySesion(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return false;
  return tokenValido(token, await versionSesion());
}

/**
 * Corta la petición si no hay sesión. Se llama en cada acción y en cada
 * consulta del admin: el proxy redirige, pero la barrera real es esta.
 */
export async function exigirSesion(): Promise<void> {
  if (!(await haySesion())) redirect("/admin/entrar");
}
