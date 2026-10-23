import { unstable_cache } from "next/cache";
import { prepararBase, sql } from "@/lib/db";
import { sumarDias, type Reserva } from "@/lib/estudio";
import { sincronizarYouTube } from "@/lib/youtube";
import type { Episodio, EpisodioConShow, Formato, Modo, Show } from "@/lib/types";

/**
 * Capa de datos del sitio.
 *
 * Todo lo que consulta contenido pasa por acá. Los datos viven en Postgres;
 * el feed del canal de YouTube mete los episodios nuevos solo, y el admin
 * corrige, oculta o agrega lo que haga falta.
 *
 * El contenido público se guarda en la caché de Next `REVISION` segundos
 * bajo la etiqueta `TAG_CONTENIDO`. Antes de cada lectura fresca se revisa
 * el feed, así que "cada 15 minutos" es también cada cuánto se mira YouTube.
 * El admin invalida la etiqueta al guardar, para que el sitio cambie al
 * instante.
 */

export const TAG_CONTENIDO = "contenido";

/** Cada cuánto se vuelve a leer la base y el canal, en segundos. */
export const REVISION = 900;

// --- Filas de la base -> tipos del sitio --------------------------------------

export interface FilaPrograma {
  slug: string;
  nombre: string;
  bajada: string;
  cadencia: string;
  modo: Modo;
  formatos: Formato[];
  spotify_show_id: string | null;
  horario_vivo: string | null;
  alias: string[];
  fondo: string;
  tinta: string;
  secundario: string;
  orden: number;
  oculto: boolean;
}

export interface FilaEpisodio {
  id: string;
  programa_slug: string;
  numero: string | null;
  titulo: string;
  detalle: string | null;
  fecha: string;
  duracion: string | null;
  youtube_id: string | null;
  spotify_episode_id: string | null;
  formatos: Formato[];
  origen: "manual" | "youtube";
  oculto: boolean;
}

export function aShow(f: FilaPrograma): Show {
  return {
    slug: f.slug,
    nombre: f.nombre,
    bajada: f.bajada,
    cadencia: f.cadencia,
    modo: f.modo,
    formatos: f.formatos,
    spotifyShowId: f.spotify_show_id ?? undefined,
    horarioVivo: f.horario_vivo ?? undefined,
    alias: f.alias,
    paleta: { fondo: f.fondo, tinta: f.tinta, secundario: f.secundario },
    orden: f.orden,
    oculto: f.oculto,
  };
}

export function aEpisodio(f: FilaEpisodio): Episodio {
  return {
    id: f.id,
    showSlug: f.programa_slug,
    numero: f.numero ?? undefined,
    titulo: f.titulo,
    detalle: f.detalle ?? undefined,
    fecha: f.fecha,
    duracion: f.duracion ?? undefined,
    youtubeId: f.youtube_id ?? undefined,
    spotifyEpisodeId: f.spotify_episode_id ?? undefined,
    formatos: f.formatos,
    origen: f.origen,
    oculto: f.oculto,
  };
}

// La fecha se lee como texto para que no pase por `Date` y se corra un día.
// Es función y no constante para no tocar la conexión al importar el módulo.
// Va con el alias `e` para poder unirla con programas sin ambigüedad.
export const columnasEpisodio = () => sql`
  e.id, e.programa_slug, e.numero, e.titulo, e.detalle,
  to_char(e.fecha, 'YYYY-MM-DD') AS fecha, e.duracion, e.youtube_id,
  e.spotify_episode_id, e.formatos, e.origen, e.oculto
`;

// --- Contenido público, en caché ---------------------------------------------

interface Contenido {
  shows: Show[];
  episodios: EpisodioConShow[];
}

async function cargarContenido(): Promise<Contenido> {
  await prepararBase();
  await sincronizarYouTube();

  const shows = (
    await sql<FilaPrograma[]>`
      SELECT * FROM programas WHERE NOT oculto ORDER BY orden, nombre
    `
  ).map(aShow);
  const porSlug = new Map(shows.map((s) => [s.slug, s]));

  const episodios = (
    await sql<FilaEpisodio[]>`
      SELECT ${columnasEpisodio()} FROM episodios e
      WHERE NOT e.oculto
      ORDER BY e.fecha DESC, e.creado_en DESC
    `
  ).flatMap((f) => {
    const show = porSlug.get(f.programa_slug);
    // Un episodio de un programa oculto tampoco se muestra.
    return show ? [{ ...aEpisodio(f), show }] : [];
  });

  return { shows, episodios };
}

const getContenido = unstable_cache(cargarContenido, ["contenido"], {
  tags: [TAG_CONTENIDO],
  revalidate: REVISION,
});

export async function getShows(): Promise<Show[]> {
  return (await getContenido()).shows;
}

export async function getShow(slug: string): Promise<Show | undefined> {
  return (await getShows()).find((s) => s.slug === slug);
}

export async function getEpisodios(limite?: number): Promise<EpisodioConShow[]> {
  const lista = (await getContenido()).episodios;
  return limite ? lista.slice(0, limite) : lista;
}

/** El episodio más reciente de un programa. */
export async function getUltimoEpisodio(
  slug: string,
): Promise<EpisodioConShow | undefined> {
  return (await getEpisodios()).find((e) => e.showSlug === slug);
}

/** El episodio más reciente del canal, sin importar el programa. */
export async function getUltimoDelCanal(): Promise<
  EpisodioConShow | undefined
> {
  return (await getEpisodios())[0];
}

/** El programa que se transmite en vivo, si hay alguno. */
export async function getShowEnVivo(): Promise<Show | undefined> {
  return (await getShows()).find((s) => s.modo === "vivo");
}

// --- Ocupación del estudio, en caché -----------------------------------------

/** El admin la invalida al guardar o borrar una reserva. */
export const TAG_ESTUDIO = "estudio";

/** Lo que el público ve de una renta en lugar del nombre del cliente. */
export const OCUPADO = "Ocupado";

// De una renta solo sale de la base que el horario está tomado: el nombre del
// cliente se cambia por OCUPADO en la consulta misma y las notas no se piden.
// Los programas del canal sí van con su nombre.
async function cargarOcupacion(desde: string, hasta: string): Promise<Reserva[]> {
  await prepararBase();
  const filas = await sql<Reserva[]>`
    SELECT id, tipo,
      CASE WHEN tipo = 'propio' THEN quien ELSE ${OCUPADO}::text END AS quien,
      to_char(desde, 'YYYY-MM-DD HH24:MI') AS desde,
      to_char(hasta, 'YYYY-MM-DD HH24:MI') AS hasta
    FROM reservas
    WHERE desde < ${hasta}::timestamp AND hasta > ${desde}::timestamp
    ORDER BY desde
  `;
  return filas.map((f) => ({ ...f }));
}

const getOcupacion = unstable_cache(cargarOcupacion, ["estudio"], {
  tags: [TAG_ESTUDIO],
  revalidate: REVISION,
});

/** Quién ocupa el estudio la semana que empieza en `lunes`, para el sitio. */
export async function getOcupacionEstudio(lunes: string): Promise<Reserva[]> {
  return getOcupacion(`${lunes} 00:00`, `${sumarDias(lunes, 7)} 00:00`);
}

// --- Etiquetas y formato ------------------------------------------------------

/**
 * Cómo se distribuye un programa, en una etiqueta corta:
 * "EN VIVO · YOUTUBE", "GRABADO · YT + SPOTIFY", "GRABADO · YOUTUBE".
 */
export function etiquetaDistribucion(show: Show): string {
  const modo = show.modo === "vivo" ? "EN VIVO" : "GRABADO";
  const donde = show.formatos.includes("audio") ? "YT + SPOTIFY" : "YOUTUBE";
  return `${modo} · ${donde}`;
}

/** Cómo se nombra un episodio en una línea: "Ep. 62 · Nombre". */
export function etiquetaEpisodio(e: EpisodioConShow): string {
  const numero = e.numero ? `Ep. ${e.numero}` : e.detalle;
  return numero ? `${numero} · ${e.titulo}` : e.titulo;
}

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * "2024-12-13" -> "13 DIC 24".
 *
 * Se formatea a mano, sin `Date`, para que el servidor y el navegador
 * escriban exactamente lo mismo: `new Date("2024-12-13")` se interpreta en
 * UTC y en México se corre un día.
 */
export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia} ${MESES[Number(mes) - 1].toUpperCase()} ${anio.slice(2)}`;
}
