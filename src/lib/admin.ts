import { exigirSesion } from "@/lib/auth";
import {
  aEpisodio,
  aShow,
  columnasEpisodio,
  type FilaEpisodio,
  type FilaPrograma,
} from "@/lib/content";
import { prepararBase, sql } from "@/lib/db";
import type { Reserva, TipoReserva } from "@/lib/estudio";
import type { Episodio, Show } from "@/lib/types";
import { bloquearEstudio, expirarApartadosTx, limpiarApartados } from "./pagos-estudio";
import { ErrorPago } from "./pagos-estudio-reglas";

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

// --- Estudio ------------------------------------------------------------------

interface FilaReserva {
  id: number;
  quien: string;
  tipo: TipoReserva;
  desde: string;
  hasta: string;
  notas: string | null;
  pedido_id: string | null;
  estado: "apartado" | "confirmada";
}

// Las horas se leen como texto para que el driver no las convierta a `Date`
// (las interpretaría en UTC y se correrían seis horas).
const columnasReserva = () => sql`
  id, quien, tipo,
  to_char(desde, 'YYYY-MM-DD HH24:MI') AS desde,
  to_char(hasta, 'YYYY-MM-DD HH24:MI') AS hasta,
  notas, pedido_id, estado
`;

function aReserva(f: FilaReserva): Reserva {
  return {
    id: f.id,
    quien: f.quien,
    tipo: f.tipo,
    desde: f.desde,
    hasta: f.hasta,
    notas: f.notas ?? undefined,
    pedidoId: f.pedido_id ?? undefined,
    estado: f.estado,
  };
}

/** Las reservas que tocan el rango [desde, hasta), en hora de Mérida. */
export async function listarReservas(
  desde: string,
  hasta: string,
): Promise<Reserva[]> {
  await abrir();
  await limpiarApartados();
  const filas = await sql<FilaReserva[]>`
    SELECT ${columnasReserva()} FROM reservas
    WHERE desde < ${hasta}::timestamp AND hasta > ${desde}::timestamp
    ORDER BY desde
  `;
  return filas.map(aReserva);
}

export async function obtenerReserva(id: number): Promise<Reserva | undefined> {
  await abrir();
  const [fila] = await sql<FilaReserva[]>`
    SELECT ${columnasReserva()} FROM reservas WHERE id = ${id}
  `;
  return fila ? aReserva(fila) : undefined;
}

/**
 * La primera reserva que se pisa con [desde, hasta), si hay alguna. Al
 * editar se pasa el propio id para no chocar con uno mismo.
 */
export async function choqueReserva(
  desde: string,
  hasta: string,
  ignorarId?: number,
): Promise<Reserva | undefined> {
  await abrir();
  await limpiarApartados();
  const [fila] = await sql<FilaReserva[]>`
    SELECT ${columnasReserva()} FROM reservas
    WHERE desde < ${hasta}::timestamp AND hasta > ${desde}::timestamp
      AND id <> ${ignorarId ?? 0}
    ORDER BY desde
    LIMIT 1
  `;
  return fila ? aReserva(fila) : undefined;
}

export type DatosReserva = Omit<Reserva, "id">;

/** Crea o, con `id`, actualiza. Si choca con otra, la base rechaza (23P01). */
export async function guardarReserva(
  datos: DatosReserva,
  id?: number,
): Promise<void> {
  await abrir();
  const fila = {
    quien: datos.quien,
    tipo: datos.tipo,
    desde: datos.desde,
    hasta: datos.hasta,
    notas: datos.notas ?? null,
  };

  await sql.begin(async tx => {
    await bloquearEstudio(tx);
    await expirarApartadosTx(tx);
    if (id) {
      const [anterior] = await tx`SELECT pedido_id FROM reservas WHERE id = ${id}`;
      if (anterior?.pedido_id) throw new ErrorPago("Esta reserva está vinculada a un pago. Revísala en Pedidos.");
      await tx`UPDATE reservas SET ${tx(fila)}, actualizado_en = now() WHERE id = ${id}`;
    } else {
      await tx`INSERT INTO reservas ${tx(fila)}`;
    }
  });
}

export async function eliminarReserva(id: number): Promise<void> {
  await abrir();
  await sql.begin(async tx => {
    await bloquearEstudio(tx);
    await expirarApartadosTx(tx);
    const [reserva] = await tx`SELECT pedido_id FROM reservas WHERE id = ${id}`;
    if (reserva?.pedido_id) throw new ErrorPago("Esta reserva está vinculada a un pago. Revísala en Pedidos.");
    await tx`DELETE FROM reservas WHERE id = ${id}`;
  });
}
