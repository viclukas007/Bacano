import { exigirSesion } from "@/lib/auth";
import {
  aEpisodio,
  aShow,
  columnasEpisodio,
  type FilaEpisodio,
  type FilaPrograma,
} from "@/lib/content";
import { prepararBase, sql } from "@/lib/db";
import type { Episodio, Show } from "@/lib/types";

/**
 * Consultas del admin. A diferencia de `content.ts`, van directo a la base
 * (sin caché) e incluyen lo oculto. Cada una exige sesión: el proxy solo
 * redirige, la barrera es esta.
 */

async function abrir() {
  await exigirSesion();
  await prepararBase();
}

// --- Programas ----------------------------------------------------------------

export async function listarProgramas(): Promise<Show[]> {
  await abrir();
  const filas = await sql<FilaPrograma[]>`
    SELECT * FROM programas ORDER BY orden, nombre
  `;
  return filas.map(aShow);
}

export async function obtenerPrograma(slug: string): Promise<Show | undefined> {
  await abrir();
  const [fila] = await sql<FilaPrograma[]>`
    SELECT * FROM programas WHERE slug = ${slug}
  `;
  return fila ? aShow(fila) : undefined;
}

export type DatosPrograma = Omit<Show, "orden" | "oculto"> & {
  orden: number;
  oculto: boolean;
};

/** Crea o actualiza. `slugAnterior` permite renombrar el slug. */
export async function guardarPrograma(
  datos: DatosPrograma,
  slugAnterior?: string,
): Promise<void> {
  await abrir();
  const fila = {
    slug: datos.slug,
    nombre: datos.nombre,
    bajada: datos.bajada,
    cadencia: datos.cadencia,
    modo: datos.modo,
    formatos: datos.formatos,
    spotify_show_id: datos.spotifyShowId ?? null,
    horario_vivo: datos.horarioVivo ?? null,
    alias: datos.alias ?? [],
    fondo: datos.paleta.fondo,
    tinta: datos.paleta.tinta,
    secundario: datos.paleta.secundario,
    orden: datos.orden,
    oculto: datos.oculto,
  };

  if (slugAnterior) {
    // Los episodios siguen al slug nuevo por el ON UPDATE CASCADE.
    await sql`
      UPDATE programas SET ${sql(fila)}, actualizado_en = now()
      WHERE slug = ${slugAnterior}
    `;
  } else {
    await sql`INSERT INTO programas ${sql(fila)}`;
  }
}

/** Borra un programa. Falla si todavía tiene episodios. */
export async function eliminarPrograma(slug: string): Promise<void> {
  await abrir();
  await sql`DELETE FROM programas WHERE slug = ${slug}`;
}

export async function contarEpisodiosDe(slug: string): Promise<number> {
  await abrir();
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM episodios WHERE programa_slug = ${slug}
  `;
  return n;
}

// --- Episodios ----------------------------------------------------------------

export interface EpisodioAdmin extends Episodio {
  programaNombre: string;
}

export async function listarEpisodios(): Promise<EpisodioAdmin[]> {
  await abrir();
  const filas = await sql<(FilaEpisodio & { programa_nombre: string })[]>`
    SELECT ${columnasEpisodio()}, p.nombre AS programa_nombre
    FROM episodios e JOIN programas p ON p.slug = e.programa_slug
    ORDER BY e.fecha DESC, e.creado_en DESC
  `;
  return filas.map((f) => ({ ...aEpisodio(f), programaNombre: f.programa_nombre }));
}

export async function obtenerEpisodio(id: string): Promise<Episodio | undefined> {
  await abrir();
  const [fila] = await sql<FilaEpisodio[]>`
    SELECT ${columnasEpisodio()} FROM episodios e WHERE e.id = ${id}
  `;
  return fila ? aEpisodio(fila) : undefined;
}

export type DatosEpisodio = Omit<Episodio, "origen" | "oculto"> & {
  oculto: boolean;
};

export async function guardarEpisodio(
  datos: DatosEpisodio,
  idAnterior?: string,
): Promise<void> {
  await abrir();
  const fila = {
    id: datos.id,
    programa_slug: datos.showSlug,
    numero: datos.numero ?? null,
    titulo: datos.titulo,
    detalle: datos.detalle ?? null,
    fecha: datos.fecha,
    duracion: datos.duracion ?? null,
    youtube_id: datos.youtubeId ?? null,
    spotify_episode_id: datos.spotifyEpisodeId ?? null,
    formatos: datos.formatos,
    oculto: datos.oculto,
  };

  if (idAnterior) {
    await sql`
      UPDATE episodios SET ${sql(fila)}, actualizado_en = now()
      WHERE id = ${idAnterior}
    `;
  } else {
    await sql`INSERT INTO episodios ${sql({ ...fila, origen: "manual" })}`;
  }
}

export async function eliminarEpisodio(id: string): Promise<void> {
  await abrir();
  await sql`DELETE FROM episodios WHERE id = ${id}`;
}

export async function existeEpisodio(id: string): Promise<boolean> {
  await abrir();
  const [fila] = await sql`SELECT 1 FROM episodios WHERE id = ${id}`;
  return Boolean(fila);
}

export async function existePrograma(slug: string): Promise<boolean> {
  await abrir();
  const [fila] = await sql`SELECT 1 FROM programas WHERE slug = ${slug}`;
  return Boolean(fila);
}
