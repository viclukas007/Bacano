/**
 * Tipos del contenido del canal.
 *
 * Los datos viven en Postgres (ver `src/lib/db.ts`); `src/content/*` es la
 * semilla con la que se carga la base la primera vez. Las páginas consumen
 * estos tipos a través de `src/lib/content.ts`.
 */

/** Dónde se puede consumir un episodio. */
export type Formato = "video" | "audio";

/** Cómo se produce el programa. */
export type Modo = "vivo" | "grabado";

/** De dónde salió un episodio. */
export type Origen = "manual" | "youtube";

export interface PaletaBanda {
  /** Fondo de la banda del programa. */
  fondo: string;
  /** Color del texto principal sobre esa banda. */
  tinta: string;
  /** Color del texto secundario sobre esa banda. */
  secundario: string;
}

export interface Show {
  slug: string;
  nombre: string;
  bajada: string;
  /** Etiqueta de ritmo, en mayúsculas: "SEMANAL", "MENSUAL". */
  cadencia: string;
  modo: Modo;
  formatos: Formato[];
  /** ID del show en Spotify, si tiene feed de audio propio. */
  spotifyShowId?: string;
  /** Día y hora de la transmisión, solo para los programas en vivo. */
  horarioVivo?: string;
  /** Otros nombres con los que aparece en los títulos de YouTube. */
  alias?: string[];
  paleta: PaletaBanda;
  /** Posición en la home; menor va primero. */
  orden?: number;
  /** Un programa oculto no se muestra ni recibe episodios del feed. */
  oculto?: boolean;
}

export interface Episodio {
  /** Identificador estable. Usamos el ID de YouTube cuando existe. */
  id: string;
  showSlug: string;
  /** Número dentro del programa, tal como lo nombra el canal. */
  numero?: string;
  titulo: string;
  /** Detalle opcional: invitado, especial, semana de la NFL. */
  detalle?: string;
  /** Fecha de publicación en ISO (YYYY-MM-DD). */
  fecha: string;
  /** Duración ya formateada, p. ej. "54:10". */
  duracion?: string;
  youtubeId?: string;
  spotifyEpisodeId?: string;
  formatos: Formato[];
  origen?: Origen;
  /** Un episodio oculto queda en la base pero no se muestra. */
  oculto?: boolean;
}

/** Episodio con su programa ya resuelto, que es lo que consumen las vistas. */
export interface EpisodioConShow extends Episodio {
  show: Show;
}
