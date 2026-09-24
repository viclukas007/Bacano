import Image from "next/image";
import { site } from "@/content/site";
import { getShowEnVivo, getUltimoEpisodio } from "@/lib/content";
import { IconPlay } from "@/components/icons";

export async function Hero() {
  const showVivo = await getShowEnVivo();
  const ultimoDelVivo = showVivo
    ? await getUltimoEpisodio(showVivo.slug)
    : undefined;

  return (
    <section id="top" className="bg-morado px-5 pt-12 sm:px-8 lg:px-11 lg:pt-13">
      <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-11">
        <div className="pb-2 lg:pb-12">
          <p className="display mb-5 inline-block bg-tinta px-3.5 py-1.5 text-[13px] tracking-[0.14em] text-cian sm:text-[15px]">
            Tres programas volvieron el {site.relanzamiento.etiqueta}
          </p>

          <h1 className="display mb-5 text-[clamp(2.5rem,8vw,5.5rem)] text-white">
            Nadie es tan
            <br />
            importante,
            <br />
            <span className="text-cian">nada es tan serio.</span>
          </h1>

          <p className="mb-7 max-w-[440px] text-lg leading-relaxed text-morado-claro sm:text-xl">
            Entrevistas, libros y fantasy football. Canal de streaming y
            podcasts.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={site.youtube.url}
              className="display bg-cian px-7 py-4 text-center text-[19px] tracking-[0.06em] text-tinta transition-colors hover:bg-white"
            >
              Ver en YouTube
            </a>
            <a
              href="#archivo"
              className="display border-2 border-white px-7 py-4 text-center text-[19px] tracking-[0.06em] text-white transition-colors hover:bg-white hover:text-morado"
            >
              Escuchar
            </a>
          </div>
        </div>

        {showVivo && (
          <a
            href={site.youtube.url}
            className="group relative block border-[3px] border-cian bg-tinta"
          >
            <span className="relative flex aspect-video items-center justify-center overflow-hidden">
              {ultimoDelVivo?.youtubeId && (
                <Image
                  src={`https://i.ytimg.com/vi/${ultimoDelVivo.youtubeId}/hqdefault.jpg`}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover opacity-45 transition-opacity group-hover:opacity-60"
                />
              )}
              <span className="relative flex size-[72px] items-center justify-center bg-cian text-tinta sm:size-[88px]">
                <IconPlay size={30} />
              </span>
            </span>

            <span className="display absolute left-4 top-4 bg-vivo px-3 py-1.5 text-[13px] tracking-[0.12em] text-white sm:text-[14px]">
              Primera transmisión
            </span>

            <span className="block bg-cian px-5 py-4">
              <span className="display block text-[clamp(1.15rem,3.4vw,1.625rem)] leading-tight text-tinta">
                {showVivo.nombre} · en vivo
              </span>
              <span className="mt-1 block text-sm font-medium text-cian-tinta">
                {showVivo.horarioVivo} por YouTube · después queda grabado
              </span>
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
