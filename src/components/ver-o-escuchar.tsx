import { site } from "@/content/site";
import { getUltimoDelCanal, getUltimoEpisodio } from "@/lib/content";
import { EmbedFacade } from "@/components/embed-facade";
import { IconPlay, IconSpotify } from "@/components/icons";

/**
 * Cuando exista detección de directo, el embed de "Ver" pasa a esta URL y
 * YouTube resuelve solo cuál es la transmisión en curso.
 */
const EMBED_VIVO = `https://www.youtube-nocookie.com/embed/live_stream?channel=${site.youtube.canalId}&autoplay=1`;

export async function VerOEscuchar() {
  const ultimo = await getUltimoDelCanal();
  // El de Spotify es siempre El Show sin Dinos: es el único con feed de audio.
  const ultimoConAudio = await getUltimoEpisodio("el-show-sin-dinos");

  const embedVideo = ultimo?.youtubeId
    ? `https://www.youtube-nocookie.com/embed/${ultimo.youtubeId}?autoplay=1`
    : EMBED_VIVO;

  const embedAudio = `https://open.spotify.com/embed/show/${site.spotify.showId}?utm_source=generator`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <article className="border-[3px] border-cian p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="display bg-youtube px-3 py-1.5 text-[13px] tracking-[0.1em] text-white sm:text-[14px]">
            YouTube
          </span>
          <h3 className="display text-[24px] text-white sm:text-[28px]">Ver</h3>
        </div>

        <EmbedFacade
          src={embedVideo}
          titulo="Reproductor de YouTube de Bacano Media"
          etiqueta="Ver el último episodio"
          poster={
            ultimo?.youtubeId
              ? `https://i.ytimg.com/vi/${ultimo.youtubeId}/hqdefault.jpg`
              : undefined
          }
          acento="#FF3B30"
          acentoTinta="#FFFFFF"
          formato="video"
        >
          <IconPlay size={19} />
        </EmbedFacade>

        <p className="my-5 text-[15px] leading-relaxed text-gris">
          Los tres programas viven aquí, con video. Completo, sin cuenta, para
          cualquiera.
        </p>

        <a
          href={site.youtube.url}
          className="display inline-block bg-cian px-6 py-3.5 text-[17px] tracking-[0.06em] text-tinta transition-colors hover:bg-white"
        >
          Suscribirme
        </a>
      </article>

      <article className="border-[3px] border-morado p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="display bg-spotify px-3 py-1.5 text-[13px] tracking-[0.1em] text-tinta sm:text-[14px]">
            Spotify
          </span>
          <h3 className="display text-[24px] text-white sm:text-[28px]">
            Escuchar
          </h3>
        </div>

        <EmbedFacade
          src={embedAudio}
          titulo="Reproductor de Spotify de El Show sin Dinos"
          etiqueta="Escuchar en Spotify"
          poster={
            ultimoConAudio?.youtubeId
              ? `https://i.ytimg.com/vi/${ultimoConAudio.youtubeId}/hqdefault.jpg`
              : undefined
          }
          acento="#1ED760"
          acentoTinta="#0A0A0A"
          formato="audio"
        >
          <IconSpotify size={24} />
        </EmbedFacade>

        <p className="my-5 text-[15px] leading-relaxed text-gris">
          Por ahora solo El Show sin Dinos tiene feed de audio. Este bloque
          suma seguidores; a quien no tenga sesión en Spotify le reproduce 30
          segundos.
        </p>

        <a
          href={site.spotify.url}
          className="display inline-block bg-spotify px-6 py-3.5 text-[17px] tracking-[0.06em] text-tinta transition-colors hover:bg-white"
        >
          Seguir el show
        </a>
      </article>
    </div>
  );
}
