import postgres from "postgres";
import { episodios as semillaEpisodios } from "@/content/episodes";
import { shows as semillaShows } from "@/content/shows";
import { ESQUEMA_PAGOS } from "./pagos-estudio-esquema";

/**
 * Conexión a Postgres y esquema.
 *
 * La URL viene de `DATABASE_URL`. El esquema se crea solo la primera vez
 * que se toca la base en cada arranque (CREATE IF NOT EXISTS, así que es
 * inofensivo repetirlo), y si las tablas están vacías se cargan con lo que
 * hay en `src/content/*`, que queda como semilla y ya no como fuente.
 */

type Sql = ReturnType<typeof postgres>;

declare global {
  // En desarrollo, Next recarga los módulos y sin esto se abriría un pool
  // nuevo en cada cambio.
  var __bacanoSql: Sql | undefined;
}

function conectar(): Sql {
  if (globalThis.__bacanoSql) return globalThis.__bacanoSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en el entorno.");
  const instancia = postgres(url, { max: 5, onnotice: () => {} });
  if (process.env.NODE_ENV !== "production") globalThis.__bacanoSql = instancia;
  return instancia;
}

let instancia: Sql | undefined;

/**
 * La conexión se abre en el primer uso, no al importar: `next build` carga
 * estos módulos para recopilar las páginas y ahí no hay base ni variables.
 */
export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  apply(_objetivo, _this, args) {
    instancia ??= conectar();
    return Reflect.apply(instancia as unknown as (...a: unknown[]) => unknown, instancia, args);
  },
  get(_objetivo, propiedad) {
    instancia ??= conectar();
    const valor = Reflect.get(instancia, propiedad);
    return typeof valor === "function" ? valor.bind(instancia) : valor;
  },
});

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS programas (
    slug            text PRIMARY KEY,
    nombre          text NOT NULL,
    bajada          text NOT NULL DEFAULT '',
    cadencia        text NOT NULL DEFAULT '',
    modo            text NOT NULL CHECK (modo IN ('vivo', 'grabado')),
    formatos        text[] NOT NULL DEFAULT '{video}',
    spotify_show_id text,
    horario_vivo    text,
    -- Otros nombres con los que el programa aparece en los títulos de YouTube.
    alias           text[] NOT NULL DEFAULT '{}',
    fondo           text NOT NULL DEFAULT '#1A1A1A',
    tinta           text NOT NULL DEFAULT '#FFFFFF',
    secundario      text NOT NULL DEFAULT '#A8A8A8',
    orden           integer NOT NULL DEFAULT 0,
    oculto          boolean NOT NULL DEFAULT false,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS episodios (
    id                 text PRIMARY KEY,
    programa_slug      text NOT NULL REFERENCES programas(slug) ON UPDATE CASCADE,
    numero             text,
    titulo             text NOT NULL,
    detalle            text,
    fecha              date NOT NULL,
    duracion           text,
    youtube_id         text,
    spotify_episode_id text,
    formatos           text[] NOT NULL DEFAULT '{video}',
    -- 'youtube' si lo trajo el feed, 'manual' si lo cargó alguien.
    origen             text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'youtube')),
    oculto             boolean NOT NULL DEFAULT false,
    creado_en          timestamptz NOT NULL DEFAULT now(),
    actualizado_en     timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS episodios_fecha ON episodios (fecha DESC);

  -- Pares clave/valor: hash de la clave del admin, versión de las sesiones.
  CREATE TABLE IF NOT EXISTS ajustes (
    clave           text PRIMARY KEY,
    valor           text NOT NULL,
    actualizado_en  timestamptz NOT NULL DEFAULT now()
  );

  -- Reservas del estudio (se editan en el admin; ver src/lib/estudio.ts).
  -- desde/hasta van sin zona horaria, en hora de Mérida tal cual se escriben.
  CREATE TABLE IF NOT EXISTS reservas (
    id              serial PRIMARY KEY,
    quien           text NOT NULL,
    -- 'renta' si viene de afuera, 'propio' si es un programa del canal.
    tipo            text NOT NULL DEFAULT 'renta' CHECK (tipo IN ('renta', 'propio')),
    desde           timestamp NOT NULL,
    hasta           timestamp NOT NULL,
    notas           text,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now(),
    CHECK (hasta > desde),
    -- Dos reservas no pueden ocupar el estudio al mismo tiempo. El rango es
    -- [desde, hasta): una que termina a las 12 y otra que empieza a las 12
    -- no chocan. La base lo garantiza aunque se guarden dos a la vez.
    EXCLUDE USING gist (tsrange(desde, hasta) WITH &&)
  );

  CREATE INDEX IF NOT EXISTS reservas_desde ON reservas (desde);
`;

async function sembrar(conexion: Sql | postgres.TransactionSql) {
  const [{ n: programas }] = await conexion<{ n: number }[]>`
    SELECT count(*)::int AS n FROM programas
  `;
  if (programas === 0) {
    for (const [orden, s] of semillaShows.entries()) {
      await conexion`
        INSERT INTO programas
          (slug, nombre, bajada, cadencia, modo, formatos, spotify_show_id,
           horario_vivo, fondo, tinta, secundario, orden)
        VALUES
          (${s.slug}, ${s.nombre}, ${s.bajada}, ${s.cadencia}, ${s.modo},
           ${s.formatos}, ${s.spotifyShowId ?? null}, ${s.horarioVivo ?? null},
           ${s.paleta.fondo}, ${s.paleta.tinta}, ${s.paleta.secundario}, ${orden})
      `;
    }
  }

  const [{ n: episodios }] = await conexion<{ n: number }[]>`
    SELECT count(*)::int AS n FROM episodios
  `;
  if (episodios === 0) {
    for (const e of semillaEpisodios) {
      await conexion`
        INSERT INTO episodios
          (id, programa_slug, numero, titulo, detalle, fecha, duracion,
           youtube_id, spotify_episode_id, formatos, origen)
        VALUES
          (${e.id}, ${e.showSlug}, ${e.numero ?? null}, ${e.titulo},
           ${e.detalle ?? null}, ${e.fecha}, ${e.duracion ?? null},
           ${e.youtubeId ?? null}, ${e.spotifyEpisodeId ?? null},
           ${e.formatos}, 'manual')
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }
}

let lista: Promise<void> | undefined;

/** Deja la base lista para usar. Se ejecuta una vez por proceso. */
export function prepararBase(): Promise<void> {
  lista ??= (async () => {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(948321, 0)`;
      await tx.unsafe(ESQUEMA);
      await tx.unsafe(ESQUEMA_PAGOS);
      await sembrar(tx);
    });
  })().catch((error) => {
    // Si falló, que el próximo intento vuelva a probar.
    lista = undefined;
    throw error;
  });
  return lista;
}
