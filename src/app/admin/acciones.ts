"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as admin from "@/lib/admin";
import {
  cambiarClave as guardarClaveNueva,
  cerrarSesion,
  claveCorrecta,
  exigirSesion,
  iniciarSesion,
} from "@/lib/auth";
import { TAG_CONTENIDO } from "@/lib/content";
import {
  describirReserva,
  fechaValida,
  horaValida,
  sumarDias,
  type TipoReserva,
} from "@/lib/estudio";
import type { Formato, Modo } from "@/lib/types";
import { sincronizarYouTube } from "@/lib/youtube";

/**
 * Acciones del admin. Todas devuelven `{ error }` para que el formulario lo
 * muestre, o redirigen cuando salió bien. Al guardar se invalida la caché
 * del sitio, así el cambio se ve al instante.
 */

export type Estado = {
  error?: string;
  mensaje?: string;
  /**
   * Lo que se mandó, para volver a mostrarlo junto al error: React reinicia
   * el formulario al terminar la acción y si no se perdería lo tecleado.
   */
  valores?: Record<string, string>;
} | null;

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

function opcional(fd: FormData, campo: string): string | undefined {
  return texto(fd, campo) || undefined;
}

function formatos(fd: FormData): Formato[] {
  const lista = fd.getAll("formatos").map(String) as Formato[];
  return lista.filter((f) => f === "video" || f === "audio");
}

function publicar() {
  updateTag(TAG_CONTENIDO);
}

// --- Sesión -------------------------------------------------------------------

export async function entrar(_previo: Estado, fd: FormData): Promise<Estado> {
  // Una pausa corta para que probar claves a lo bruto no sea gratis.
  await new Promise((r) => setTimeout(r, 400));

  if (!(await claveCorrecta(texto(fd, "clave")))) {
    return { error: "La clave no es esa." };
  }
  await iniciarSesion();
  redirect("/admin");
}

export async function cambiarClave(
  _previo: Estado,
  fd: FormData,
): Promise<Estado> {
  await exigirSesion();
  await new Promise((r) => setTimeout(r, 400));

  const actual = texto(fd, "actual");
  const nueva = texto(fd, "nueva");
  const repetida = texto(fd, "repetida");

  if (!(await claveCorrecta(actual))) return { error: "La clave actual no es esa." };
  if (nueva.length < 10) return { error: "La clave nueva tiene que tener al menos 10 caracteres." };
  if (nueva !== repetida) return { error: "Las dos claves nuevas no coinciden." };
  if (nueva === actual) return { error: "Es la misma clave de siempre." };

  await guardarClaveNueva(nueva);
  // Cambiar la clave cierra todas las sesiones, esta incluida.
  await cerrarSesion();
  redirect("/admin/entrar?clave=cambiada");
}

export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect("/admin/entrar");
}

// --- YouTube ------------------------------------------------------------------

export async function revisarYouTube(): Promise<Estado> {
  await exigirSesion();
  const r = await sincronizarYouTube();
  if (r.error) return { error: `No se pudo leer el canal: ${r.error}` };

  if (r.nuevos.length) publicar();

  const partes = [
    r.nuevos.length
      ? `Entraron ${r.nuevos.length}: ${r.nuevos.join(" · ")}`
      : "No hay episodios nuevos en el canal.",
  ];
  if (r.ignorados.length) {
    partes.push(
      `Sin programa reconocido (${r.ignorados.length}): ${r.ignorados.join(" · ")}`,
    );
  }
  return { mensaje: partes.join(" — ") };
}

// --- Episodios ----------------------------------------------------------------

const ID_YOUTUBE = /^[\w-]{11}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function guardarEpisodio(
  _previo: Estado,
  fd: FormData,
): Promise<Estado> {
  await exigirSesion();

  const idAnterior = opcional(fd, "idAnterior");
  const youtubeId = opcional(fd, "youtubeId");
  const titulo = texto(fd, "titulo");
  const fecha = texto(fd, "fecha");
  const showSlug = texto(fd, "showSlug");
  const lista = formatos(fd);

  if (!titulo) return { error: "Falta el título." };
  if (!FECHA.test(fecha)) return { error: "La fecha tiene que ser AAAA-MM-DD." };
  if (!showSlug) return { error: "Elegí un programa." };
  if (lista.length === 0) return { error: "Marcá al menos un formato." };
  if (youtubeId && !ID_YOUTUBE.test(youtubeId)) {
    return { error: "El ID de YouTube son los 11 caracteres después de v=." };
  }
  if (!(await admin.existePrograma(showSlug))) {
    return { error: "Ese programa no existe." };
  }

  // El ID es el de YouTube cuando hay; si no, uno propio.
  const id = idAnterior ?? youtubeId ?? `ep-${Date.now().toString(36)}`;
  if (!idAnterior && (await admin.existeEpisodio(id))) {
    return { error: "Ese video ya está cargado." };
  }

  await admin.guardarEpisodio(
    {
      id,
      showSlug,
      numero: opcional(fd, "numero"),
      titulo,
      detalle: opcional(fd, "detalle"),
      fecha,
      duracion: opcional(fd, "duracion"),
      youtubeId,
      spotifyEpisodeId: opcional(fd, "spotifyEpisodeId"),
      formatos: lista,
      oculto: fd.get("oculto") === "on",
    },
    idAnterior,
  );

  publicar();
  redirect("/admin");
}

export async function eliminarEpisodio(fd: FormData): Promise<void> {
  await exigirSesion();
  await admin.eliminarEpisodio(texto(fd, "id"));
  publicar();
  redirect("/admin");
}

// --- Programas ----------------------------------------------------------------

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR = /^#[0-9a-f]{6}$/i;

export async function guardarPrograma(
  _previo: Estado,
  fd: FormData,
): Promise<Estado> {
  await exigirSesion();

  const slugAnterior = opcional(fd, "slugAnterior");
  const slug = texto(fd, "slug");
  const nombre = texto(fd, "nombre");
  const modo = texto(fd, "modo") as Modo;
  const lista = formatos(fd);
  const fondo = texto(fd, "fondo");
  const tinta = texto(fd, "tinta");
  const secundario = texto(fd, "secundario");

  if (!nombre) return { error: "Falta el nombre." };
  if (!SLUG.test(slug)) {
    return { error: "El slug va en minúsculas, sin espacios: 'mi-programa'." };
  }
  if (modo !== "vivo" && modo !== "grabado") return { error: "Elegí el modo." };
  if (lista.length === 0) return { error: "Marcá al menos un formato." };
  if (![fondo, tinta, secundario].every((c) => COLOR.test(c))) {
    return { error: "Los colores van en hexadecimal: #883EE8." };
  }
  if (slug !== slugAnterior && (await admin.existePrograma(slug))) {
    return { error: "Ya hay un programa con ese slug." };
  }

  await admin.guardarPrograma(
    {
      slug,
      nombre,
      bajada: texto(fd, "bajada"),
      cadencia: texto(fd, "cadencia").toUpperCase(),
      modo,
      formatos: lista,
      spotifyShowId: opcional(fd, "spotifyShowId"),
      horarioVivo: modo === "vivo" ? opcional(fd, "horarioVivo") : undefined,
      alias: texto(fd, "alias")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      paleta: { fondo, tinta, secundario },
      orden: Number(texto(fd, "orden")) || 0,
      oculto: fd.get("oculto") === "on",
    },
    slugAnterior,
  );

  publicar();
  redirect("/admin/programas");
}

export async function eliminarPrograma(fd: FormData): Promise<void> {
  await exigirSesion();
  const slug = texto(fd, "slug");
  if ((await admin.contarEpisodiosDe(slug)) > 0) {
    // Con episodios no se borra; se oculta desde el formulario.
    redirect(`/admin/programas/${slug}?error=con-episodios`);
  }
  await admin.eliminarPrograma(slug);
  publicar();
  redirect("/admin/programas");
}

// --- Estudio ------------------------------------------------------------------
//
// Las reservas son solo del admin: no tocan la caché del sitio.

/** La base rechazó la reserva porque se pisa con otra (exclusion_violation). */
function chocaEnBase(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23P01"
  );
}

export async function guardarReserva(
  _previo: Estado,
  fd: FormData,
): Promise<Estado> {
  await exigirSesion();

  const idAnterior = opcional(fd, "idAnterior");
  const quien = texto(fd, "quien");
  const tipo = texto(fd, "tipo") as TipoReserva;
  const fecha = texto(fd, "fecha");
  const inicio = texto(fd, "inicio");
  const fin = texto(fd, "fin");
  const notas = texto(fd, "notas");

  const valores = { quien, tipo, fecha, inicio, fin, notas };
  const fallo = (error: string): Estado => ({ error, valores });

  if (!quien) return fallo("Poné quién ocupa el estudio.");
  if (tipo !== "renta" && tipo !== "propio") return fallo("Elegí el tipo.");
  if (!fechaValida(fecha)) return fallo("La fecha tiene que ser AAAA-MM-DD.");
  if (!horaValida(inicio) || !horaValida(fin)) return fallo("Las horas van como 22:00.");
  if (inicio === fin) return fallo("Termina a la misma hora que empieza.");

  const desde = `${fecha} ${inicio}`;
  // Si "termina antes de empezar" es que pasa de medianoche: de 22:00 a 01:00.
  const hasta = fin > inicio ? `${fecha} ${fin}` : `${sumarDias(fecha, 1)} ${fin}`;
  const id = idAnterior ? Number(idAnterior) : undefined;

  const choque = await admin.choqueReserva(desde, hasta, id);
  if (choque) {
    return fallo(`El estudio ya está ocupado: ${describirReserva(choque)}.`);
  }

  try {
    await admin.guardarReserva(
      { quien, tipo, desde, hasta, notas: notas || undefined },
      id,
    );
  } catch (error) {
    // Alguien guardó otra en el mismo hueco entre la comprobación y acá.
    if (chocaEnBase(error)) {
      return fallo("Ese horario se acaba de ocupar. Revisá la semana.");
    }
    throw error;
  }

  redirect(`/admin/estudio?semana=${fecha}`);
}

export async function eliminarReserva(fd: FormData): Promise<void> {
  await exigirSesion();
  await admin.eliminarReserva(Number(texto(fd, "id")));
  const fecha = texto(fd, "fecha");
  redirect(fechaValida(fecha) ? `/admin/estudio?semana=${fecha}` : "/admin/estudio");
}
