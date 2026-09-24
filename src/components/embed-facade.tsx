"use client";

import { useState } from "react";

type Props = {
  /** URL del iframe. Se carga recién cuando el visitante hace clic. */
  src: string;
  /** `title` del iframe: es lo que anuncia un lector de pantalla. */
  titulo: string;
  /** La acción, en imperativo: es lo que se lee sobre el botón. */
  etiqueta: string;
  /** Imagen de portada del cartel, si hay. */
  poster?: string;
  /** Color de la plataforma, para el botón. */
  acento: string;
  /** Color del icono sobre ese acento. */
  acentoTinta: string;
  /** Qué se va a incrustar: define el alto del reproductor ya cargado. */
  formato: "video" | "audio";
  children: React.ReactNode;
};

/**
 * Fachada de un embed de terceros.
 *
 * El iframe de YouTube y el de Spotify pesan mucho y dejan cookies de
 * terceros apenas se montan. Acá se dibuja un cartel estático y el iframe
 * entra solo si el visitante lo pide, así que la portada no arrastra ese
 * costo ni esas cookies.
 *
 * El hueco mide 16:9 en los dos casos, cargado o no, para que al hacer clic
 * no se mueva nada de la página. El reproductor de Spotify va centrado
 * dentro de ese hueco con sus 152 px: es la única altura de su embed que se
 * adapta al ancho. Con 352 px o más, Spotify dibuja su tarjeta grande, que
 * pide unos 624 px de ancho y en dos columnas trunca el título.
 *
 * El cartel tiene que parecer un reproductor, no un hueco por rellenar: si
 * se ve como un marcador de posición, nadie lo toca y el embed no carga
 * nunca.
 */
export function EmbedFacade({
  src,
  titulo,
  etiqueta,
  poster,
  acento,
  acentoTinta,
  formato,
  children,
}: Props) {
  const [cargado, setCargado] = useState(false);

  if (cargado) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-humo">
        <iframe
          src={src}
          title={titulo}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className={`w-full border-0 ${
            formato === "video" ? "h-full" : "h-[152px]"
          }`}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setCargado(true)}
      className="group relative flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden bg-humo px-5 text-center"
    >
      {poster && (
        // Portada decorativa: no aporta información, por eso va como estilo.
        <span
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
      {/* Vela sobre la portada: sin esto el texto blanco no se lee. */}
      <span aria-hidden className="absolute inset-0 bg-tinta/65" />

      <span
        className="relative flex size-16 items-center justify-center transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: acento, color: acentoTinta }}
      >
        {children}
      </span>
      <span className="display relative text-[18px] text-white sm:text-[21px]">
        {etiqueta}
      </span>
    </button>
  );
}
