import {
  etiquetaDistribucion,
  etiquetaEpisodio,
  getShowEnVivo,
  getShows,
  getUltimoEpisodio,
} from "@/lib/content";

export async function ShowBands() {
  const shows = await getShows();
  const showVivo = await getShowEnVivo();

  const bandas = await Promise.all(
    shows.map(async (show) => ({
      show,
      ultimo: await getUltimoEpisodio(show.slug),
    })),
  );

  return (
    <section id="programas" className="px-5 py-14 sm:px-8 lg:px-11 lg:py-16">
      <div className="mb-8 flex flex-col gap-4 lg:mb-[30px] lg:flex-row lg:items-end lg:justify-between">
        <h2 className="display text-[clamp(2.25rem,7vw,4.75rem)] text-white">
          Cuándo sale
          <br />
          cada uno
        </h2>
        <p className="max-w-[360px] text-base leading-relaxed text-gris sm:text-lg lg:pb-2.5 lg:text-right">
          Tres programas, tres ritmos. Ninguno te pide que lo sigas todos los
          días.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {bandas.map(({ show, ultimo }) => (
          <article
            key={show.slug}
            style={{ backgroundColor: show.paleta.fondo }}
            className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[236px_minmax(0,1fr)_236px] lg:items-center lg:gap-7 lg:p-[30px]"
          >
            <div>
              <p
                className="display mb-2 text-[15px] tracking-[0.12em] sm:text-[17px]"
                style={{ color: show.paleta.secundario }}
              >
                {show.cadencia}
              </p>
              <p
                className="display inline-block px-2.5 py-1.5 text-[12px] tracking-[0.08em] sm:text-[13px]"
                style={{
                  backgroundColor: show.paleta.tinta,
                  color: show.paleta.fondo,
                }}
              >
                {etiquetaDistribucion(show)}
              </p>
            </div>

            <div>
              <h3
                className="display mb-2 text-[clamp(1.75rem,5.5vw,2.875rem)] leading-none"
                style={{ color: show.paleta.tinta }}
              >
                {show.nombre}
              </h3>
              <p
                className="text-[15px] leading-relaxed sm:text-base"
                style={{ color: show.paleta.secundario }}
              >
                {show.bajada}
              </p>
            </div>

            {ultimo && (
              <div className="lg:text-right">
                <p
                  className="display mb-1.5 text-[13px] tracking-[0.14em] sm:text-[14px]"
                  style={{ color: show.paleta.secundario }}
                >
                  Último
                </p>
                <p
                  className="text-[15px] font-bold leading-snug"
                  style={{ color: show.paleta.tinta }}
                >
                  {etiquetaEpisodio(ultimo)}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>

      {showVivo && (
        <div className="mt-6 flex flex-col gap-4 border-l-[5px] border-vivo bg-carbon p-6 sm:flex-row sm:items-center sm:gap-5">
          <p className="display shrink-0 text-[20px] tracking-[0.1em] text-vivo sm:text-[22px]">
            En vivo
          </p>
          <p className="flex-grow text-[15px] leading-relaxed text-gris sm:text-base">
            Solo {showVivo.nombre} se transmite en vivo, los{" "}
            {showVivo.horarioVivo} por YouTube. Después queda grabado como los
            demás.
          </p>
          <a
            href="#avisarme"
            className="display shrink-0 bg-cian px-5 py-3 text-center text-[16px] tracking-[0.06em] text-tinta transition-colors hover:bg-white"
          >
            Avisarme
          </a>
        </div>
      )}
    </section>
  );
}
