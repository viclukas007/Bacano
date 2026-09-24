"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  eliminarEpisodio,
  guardarEpisodio,
  type Estado,
} from "@/app/admin/acciones";
import {
  Area,
  Aviso,
  Boton,
  Campo,
  Casilla,
  Entrada,
  Selector,
} from "@/app/admin/_ui/campos";
import type { Episodio, Show } from "@/lib/types";

export function EpisodioForm({
  episodio,
  programas,
}: {
  /** Sin episodio, el formulario crea uno nuevo. */
  episodio?: Episodio;
  programas: Show[];
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    guardarEpisodio,
    null,
  );
  const e = episodio;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form action={accion} className="flex flex-col gap-5">
        {e && <input type="hidden" name="idAnterior" value={e.id} />}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Programa">
            <Selector name="showSlug" defaultValue={e?.showSlug ?? ""} required>
              <option value="" disabled>
                Elegí uno
              </option>
              {programas.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nombre}
                  {p.oculto ? " (oculto)" : ""}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Fecha" ayuda="Día en que salió, hora de Mérida.">
            <Entrada name="fecha" type="date" defaultValue={e?.fecha} required />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Campo etiqueta="Número">
            <Entrada name="numero" defaultValue={e?.numero} placeholder="62" />
          </Campo>
          <Campo etiqueta="Título">
            <Entrada name="titulo" defaultValue={e?.titulo} required />
          </Campo>
        </div>

        <Campo etiqueta="Detalle" ayuda="Invitado, especial, semana de la NFL. Opcional.">
          <Area name="detalle" rows={2} defaultValue={e?.detalle} />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            etiqueta="ID de YouTube"
            ayuda="Los 11 caracteres después de v= en el enlace del video."
          >
            <Entrada
              name="youtubeId"
              defaultValue={e?.youtubeId}
              placeholder="X5PafdFhFak"
              maxLength={11}
            />
          </Campo>
          <Campo
            etiqueta="ID del episodio en Spotify"
            ayuda="Solo para los programas con audio. Está en el enlace del episodio."
          >
            <Entrada name="spotifyEpisodeId" defaultValue={e?.spotifyEpisodeId} />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Duración" ayuda="Como se muestra: 54:10">
            <Entrada name="duracion" defaultValue={e?.duracion} placeholder="54:10" />
          </Campo>
          <div>
            <span className="display mb-1.5 block text-[13px] tracking-[0.14em] text-cian">
              Formatos
            </span>
            <div className="flex gap-5 pt-2.5">
              <Casilla
                etiqueta="Video"
                name="formatos"
                value="video"
                defaultChecked={e ? e.formatos.includes("video") : true}
              />
              <Casilla
                etiqueta="Audio"
                name="formatos"
                value="audio"
                defaultChecked={e?.formatos.includes("audio")}
              />
            </div>
          </div>
        </div>

        <Casilla
          etiqueta="Oculto (queda guardado pero no se muestra en el sitio)"
          name="oculto"
          defaultChecked={e?.oculto}
        />

        {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}

        <div className="flex gap-3 pt-2">
          <Boton disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</Boton>
          <Link
            href="/admin"
            className="display px-5 py-3 text-[16px] tracking-[0.06em] text-gris hover:text-white"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {e && (
        <aside className="flex flex-col gap-4 border-2 border-borde p-5 text-[14px] text-gris lg:self-start">
          <p>
            <span className="text-white">ID:</span> {e.id}
          </p>
          <p>
            <span className="text-white">Origen:</span>{" "}
            {e.origen === "youtube" ? "lo trajo el feed de YouTube" : "cargado a mano"}
          </p>
          {e.youtubeId && (
            <a
              href={`https://www.youtube.com/watch?v=${e.youtubeId}`}
              target="_blank"
              rel="noreferrer"
              className="text-cian hover:underline"
            >
              Ver en YouTube ↗
            </a>
          )}
          <p className="text-[13px]">
            Si lo borrás y sigue en el canal, el feed lo vuelve a traer. Para
            que no aparezca, marcalo como oculto.
          </p>
          <form
            action={eliminarEpisodio}
            onSubmit={(ev) => {
              if (!confirm("¿Borrar este episodio?")) ev.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={e.id} />
            <Boton variante="peligro">Borrar</Boton>
          </form>
        </aside>
      )}
    </div>
  );
}
