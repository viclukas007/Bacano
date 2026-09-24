import { site } from "@/content/site";
import { sql } from "@/lib/db";
import type { Episodio, Show } from "@/lib/types";

/**
 * Episodios leídos del feed público del canal de YouTube.
 *
 * El feed trae los últimos 15 videos, sin duración ni descripción útil, así
 * que el título es lo único que dice de qué programa es cada uno. Los títulos
 * del canal siguen más o menos "Programa. Número. Título. (Detalle)", y de ahí
 * se sacan las piezas. El programa se reconoce por su nombre o por sus alias,
 * tal como están guardados en la base.
 *
 * Lo que no se reconoce (un video que no nombra a ningún programa, un short)
 * no entra. Si el feed falla, no pasa nada: el sitio sigue con lo que hay.
 */

const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${site.youtube.canalId}`;

interface EntradaFeed {
  videoId: string;
  titulo: string;
  publicado: string;
}

function decodificar(texto: string): string {
  return texto
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function leerFeed(xml: string): EntradaFeed[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, e]) => {
    const videoId = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const titulo = e.match(/<title>([^<]*)<\/title>/)?.[1];
    const publicado = e.match(/<published>([^<]+)<\/published>/)?.[1];
    return videoId && titulo && publicado
      ? [{ videoId, titulo: decodificar(titulo), publicado }]
      : [];
  });
}

/**
 * "2026-09-22T03:47:43+00:00" -> "2026-09-21".
 *
 * El feed da la hora en UTC; un programa que sale a las 10 de la noche en
 * Mérida ya es el día siguiente en UTC.
 */
function fechaLocal(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Merida",
  }).format(new Date(iso));
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "El Show sin Dinos" -> /el\s+show\s+sin\s+dinos/i, tolerante a acentos. */
function patronDeNombre(nombre: string): RegExp {
  const cuerpo = nombre
    .trim()
    .split(/\s+/)
    .map(escaparRegex)
    .join("\\s+")
    .replace(/[aá]/gi, "[aá]")
    .replace(/[eé]/gi, "[eé]")
    .replace(/[ií]/gi, "[ií]")
    .replace(/[oó]/gi, "[oó]")
    .replace(/[uú]/gi, "[uú]");
  return new RegExp(cuerpo, "i");
}

type Reconocido = Pick<Episodio, "showSlug" | "numero" | "titulo" | "detalle">;

/**
 * Separa un título del canal en programa, número, título y detalle.
 *
 *   "El Show sin Dinos.62. Alejandro Chalé. (Especial de The Beatles)"
 *   "Fantoches del Fantasy. Waivers. Week 15."
 *   "We are back - Fantoches del Fantasy. Episodio 60."
 */
export function interpretarTitulo(
  crudo: string,
  programas: Pick<Show, "slug" | "nombre" | "alias">[],
): Reconocido | null {
  let programa: (typeof programas)[number] | undefined;
  let patron: RegExp | undefined;
  for (const p of programas) {
    for (const nombre of [p.nombre, ...(p.alias ?? [])]) {
      const candidato = patronDeNombre(nombre);
      if (nombre.trim() && candidato.test(crudo)) {
        programa = p;
        patron = candidato;
        break;
      }
    }
    if (programa) break;
  }
  if (!programa || !patron) return null;

  let resto = crudo.replace(patron, " ");
  let detalle: string | undefined;
  let numero: string | undefined;

  const parentesis = resto.match(/\(([^)]+)\)/);
  if (parentesis) {
    detalle = parentesis[1].trim();
    resto = resto.replace(parentesis[0], " ");
  }

  const semana = resto.match(/\bweek\s*(\d+)/i);
  if (semana) {
    detalle ??= `Week ${semana[1]}`;
    resto = resto.replace(semana[0], " ");
  }

  const episodio =
    resto.match(/\bep(?:isodio|\.)?\s*(\d+)/i) ??
    // Un número suelto entre separadores: "Dinos.62." o ". 15."
    resto.match(/(?:^|[.|]|\s[-–—]\s)\s*(\d{1,4})\s*(?=$|[.|]|\s[-–—]\s)/);
  if (episodio) {
    numero = episodio[1];
    resto = resto.replace(episodio[0], " . ");
  }

  const titulo = resto
    .split(/\.|\||\s[-–—]\s/)
    .map((pieza) => pieza.trim())
    .filter(Boolean)
    .join(". ");

  return {
    showSlug: programa.slug,
    numero,
    titulo: titulo || detalle || programa.nombre,
    detalle: titulo ? detalle : undefined,
  };
}

/**
 * Los shorts también salen en el feed y no son episodios. YouTube contesta
 * 200 en /shorts/ID si lo es y redirige al video normal si no.
 */
async function esShort(videoId: string): Promise<boolean> {
  try {
    const r = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
    });
    return r.status === 200;
  } catch {
    return false;
  }
}

export interface ResultadoSincronizacion {
  /** Episodios que no estaban y se agregaron. */
  nuevos: string[];
  /** Videos del feed que no se pudieron atribuir a un programa. */
  ignorados: string[];
  error?: string;
}

/**
 * Lee el feed y agrega a la base los videos que todavía no están. Lo que ya
 * existe no se toca: las correcciones hechas en el admin mandan.
 */
export async function sincronizarYouTube(): Promise<ResultadoSincronizacion> {
  const resultado: ResultadoSincronizacion = { nuevos: [], ignorados: [] };

  try {
    const r = await fetch(FEED, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const entradas = leerFeed(await r.text());
    if (entradas.length === 0) return resultado;

    const programas = await sql<
      { slug: string; nombre: string; alias: string[]; formatos: string[] }[]
    >`
      SELECT slug, nombre, alias, formatos FROM programas WHERE NOT oculto
    `;
    const existentes = new Set(
      (
        await sql<{ id: string }[]>`
          SELECT id FROM episodios
          WHERE id IN ${sql(entradas.map((e) => e.videoId))}
        `
      ).map((f) => f.id),
    );

    for (const e of entradas) {
      if (existentes.has(e.videoId)) continue;

      const partes = interpretarTitulo(e.titulo, programas);
      if (!partes || (await esShort(e.videoId))) {
        resultado.ignorados.push(e.titulo);
        continue;
      }

      const programa = programas.find((p) => p.slug === partes.showSlug);
      await sql`
        INSERT INTO episodios
          (id, programa_slug, numero, titulo, detalle, fecha, youtube_id,
           formatos, origen)
        VALUES
          (${e.videoId}, ${partes.showSlug}, ${partes.numero ?? null},
           ${partes.titulo}, ${partes.detalle ?? null},
           ${fechaLocal(e.publicado)}, ${e.videoId},
           ${programa?.formatos ?? ["video"]}, 'youtube')
        ON CONFLICT (id) DO NOTHING
      `;
      resultado.nuevos.push(e.titulo);
    }
  } catch (error) {
    console.error("[bacano] no se pudo leer el feed de YouTube:", error);
    resultado.error = error instanceof Error ? error.message : String(error);
  }

  return resultado;
}
