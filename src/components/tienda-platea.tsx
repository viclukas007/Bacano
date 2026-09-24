export function TiendaPlatea() {
  return (
    <section id="tienda" className="px-5 pb-14 sm:px-8 lg:px-11 lg:pb-16">
      <div className="grid gap-6 md:grid-cols-2">
        <article className="bg-cian p-7 sm:p-9">
          <p className="display mb-3.5 text-[15px] tracking-[0.16em] text-cian-tinta sm:text-[16px]">
            Tienda Bacano
          </p>
          <h2 className="display mb-3.5 text-[clamp(2rem,6vw,3.25rem)] text-tinta">
            Llevate
            <br />
            el canal puesto
          </h2>
          <p className="mb-6 max-w-[360px] text-[15px] leading-relaxed text-cian-tinta sm:text-base">
            Remeras, buzos y gorras de cada programa. [Confirmar catálogo y
            envíos.]
          </p>
          <a
            href="#tienda"
            className="display inline-block bg-tinta px-6 py-3.5 text-[17px] tracking-[0.06em] text-cian transition-colors hover:bg-carbon"
          >
            Ir a la tienda
          </a>
        </article>

        <article className="bg-morado p-7 sm:p-9">
          <p className="display mb-3.5 text-[15px] tracking-[0.16em] text-morado-claro sm:text-[16px]">
            Platea
          </p>
          <h2 className="display mb-3.5 text-[clamp(2rem,6vw,3.25rem)] text-white">
            Vení al
            <br />
            estudio
          </h2>
          <p className="mb-6 max-w-[360px] text-[15px] leading-relaxed text-morado-claro sm:text-base">
            Entradas para ver la transmisión en vivo. [Confirmar cupo y cuándo
            se liberan.]
          </p>
          <a
            href="#avisarme"
            className="display inline-block bg-white px-6 py-3.5 text-[17px] tracking-[0.06em] text-morado-tinta transition-colors hover:bg-morado-claro"
          >
            Reservar lugar
          </a>
        </article>
      </div>
    </section>
  );
}
