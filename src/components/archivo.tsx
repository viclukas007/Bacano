"use client";

import { useState } from "react";
import { site } from "@/content/site";
import type { EpisodioConShow } from "@/lib/types";
import { IconPlay, IconYouTube } from "@/components/icons";

type Filtro = "todo" | "ver" | "escuchar";

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "todo", etiqueta: "Todo" },
  { id: "ver", etiqueta: "Ver" },
  { id: "escuchar", etiqueta: "Escuchar" },
];

function insignia(episodio: EpisodioConShow) {
  const video = episodio.formatos.includes("video");
  const audio = episodio.formatos.includes("audio");

  if (video && audio) {
    return { texto: "Video + audio", fondo: "#00EFFF", tinta: "#0A0A0A" };
  }
  if (audio) {
    return { texto: "Solo audio", fondo: "#1ED760", tinta: "#0A0A0A" };
  }
  return { texto: "Solo video", fondo: "#FF3B30", tinta: "#FFFFFF" };
}

function nombreCompleto(episodio: EpisodioConShow) {
  const partes = [episodio.show.nombre];
  if (episodio.numero) partes.push(episodio.numero);
  if (episodio.detalle) partes.push(episodio.detalle);
  return partes.join(" · ");
}

export function Archivo({
  episodios,
  fechas,
}: {
  episodios: EpisodioConShow[];
  /** Fechas ya formateadas en el servidor, por id de episodio. */
  fechas: Record<string, string>;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todo");

  const visibles = episodios.filter((e) => {
    if (filtro === "ver") return e.formatos.includes("video");
    if (filtro === "escuchar") return e.formatos.includes("audio");
    return true;
  });

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="display text-[clamp(1.75rem,5vw,2.5rem)] text-white">
          El archivo
        </h3>

        <div
          role="group"
          aria-label="Filtrar episodios por formato"
          className="flex gap-2"
        >
          {FILTROS.map((f) => {
            const activo = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltro(f.id)}
                className={`display px-4 py-2.5 text-[15px] tracking-[0.06em] transition-colors ${
                  activo
                    ? "bg-cian text-tinta"
                    : "border-2 border-borde text-white hover:border-gris-suave"
                }`}
              >
                {f.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="border-t-2 border-borde">
        {visibles.map((episodio) => {
          const marca = insignia(episodio);
          const tieneAudio = episodio.formatos.includes("audio");

          return (
            <li
              key={episodio.id}
              className="flex flex-col gap-4 border-b-2 border-borde py-5 lg:flex-row lg:items-center lg:gap-6"
            >
              <div className="flex items-center gap-3 lg:contents">
                <p className="display shrink-0 text-[15px] text-gris-tenue lg:w-24 lg:text-[17px]">
                  {fechas[episodio.id]}
                </p>
                <p
                  className="display shrink-0 px-2.5 py-1.5 text-[12px] tracking-[0.08em] lg:order-3 lg:w-fit lg:text-[13px]"
                  style={{ backgroundColor: marca.fondo, color: marca.tinta }}
                >
                  {marca.texto}
                </p>
              </div>

              <div className="lg:order-2 lg:flex-grow">
                <h4 className="display text-[clamp(1.25rem,4.5vw,1.6875rem)] leading-tight text-white">
                  {episodio.titulo}
                </h4>
                <p className="mt-1 text-sm text-gris">
                  {nombreCompleto(episodio)}
                  {episodio.duracion && ` · ${episodio.duracion}`}
                </p>
              </div>

              <div className="flex gap-2 lg:order-4 lg:shrink-0">
                {episodio.youtubeId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${episodio.youtubeId}`}
                    aria-label={`Ver en video: ${episodio.titulo}`}
                    className="flex size-11 items-center justify-center bg-carbon text-white transition-colors hover:bg-borde"
                  >
                    <IconYouTube size={18} />
                  </a>
                )}
                {tieneAudio && (
                  <a
                    href={
                      episodio.spotifyEpisodeId
                        ? `https://open.spotify.com/episode/${episodio.spotifyEpisodeId}`
                        : site.spotify.url
                    }
                    aria-label={`Escuchar el audio: ${episodio.titulo}`}
                    className="flex size-11 items-center justify-center bg-carbon text-cian transition-colors hover:bg-borde"
                  >
                    <IconPlay size={16} />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {visibles.length === 0 && (
        <p className="py-10 text-center text-gris">
          Todavía no hay episodios en este formato.
        </p>
      )}
    </>
  );
}
