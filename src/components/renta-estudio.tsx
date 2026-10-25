import Link from "next/link";
import { site } from "@/content/site";
import { getOcupacionEstudio } from "@/lib/content";
import { fechaValida, hoyEnMerida, lunesDe, rangoSemana, sumarDias } from "@/lib/estudio";
import { CarritoEstudio } from "@/components/carrito-estudio";
import { CalendarioEstudio } from "@/components/calendario-estudio";
import { IconWhatsApp } from "@/components/icons";

/** Hasta cuántas semanas adelante se puede mirar. Las pasadas no se muestran. */
const SEMANAS_ADELANTE = 8;

const NAVEGACION =
  "display border-2 border-borde px-3.5 py-2 text-[14px] tracking-[0.06em] text-white transition-colors hover:border-cian hover:text-cian";

export async function RentaEstudio({ semana }: { semana?: string }) {
  const hoy = hoyEnMerida();
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Merida", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const ahora = `${hoy} ${hora}`;
  const estaSemana = lunesDe(hoy);
  const ultima = sumarDias(estaSemana, SEMANAS_ADELANTE * 7);
  const pedida = semana && fechaValida(semana) ? lunesDe(semana) : estaSemana;
  const lunes = pedida < estaSemana ? estaSemana : pedida > ultima ? ultima : pedida;
  const reservas = await getOcupacionEstudio(lunes);

  // Cambiar de semana recarga la home con ?semana=; sin `scroll` la página
  // se queda donde está, y el ancla sirve si se abre el enlace en otra pestaña.
  const irA = (otro: string, etiqueta: string, activo: boolean) =>
    activo ? (
      <Link href={`/?semana=${otro}#estudio`} scroll={false} className={NAVEGACION}>
        {etiqueta}
      </Link>
    ) : (
      <span aria-disabled className={`${NAVEGACION} pointer-events-none opacity-40`}>
        {etiqueta}
      </span>
    );

  return (
    <section
      id="estudio"
      className="scroll-mt-16 px-5 pb-14 sm:px-8 lg:scroll-mt-[76px] lg:px-11 lg:pb-16"
    >
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="display text-[clamp(2.25rem,7vw,4.75rem)] text-white">
          Renta de
          <br />
          estudio
        </h2>
        <p className="max-w-[420px] text-base leading-relaxed text-gris sm:text-lg lg:pb-2.5 lg:text-right">
          Tu podcast, a tu manera. Elige tus horas de estudio, suma los servicios que necesitas y arma tu carrito.
        </p>
      </div>

      <CarritoEstudio hoy={hoy} ahora={ahora} lunes={lunes} ultimaFecha={sumarDias(ultima, 6)} reservas={reservas} />

      <div id="disponibilidad-estudio" className="scroll-mt-28">
      <h3 className="display mb-3 text-[28px] text-white">Consulta los horarios</h3>
      <p className="mb-5 text-sm text-gris">De 8:00 a. m. a 9:00 p. m., hora de Mérida. Agregar una sesión al carrito no aparta el horario.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {irA(sumarDias(lunes, -7), "← Anterior", lunes > estaSemana)}
        {irA(estaSemana, "Esta semana", lunes !== estaSemana)}
        {irA(sumarDias(lunes, 7), "Siguiente →", lunes < ultima)}
        <p className="display ml-1 text-[20px] text-white">{rangoSemana(lunes)}</p>
      </div>

      <CalendarioEstudio lunes={lunes} hoy={hoy} reservas={reservas} />
      </div>

      <div className="mt-8 flex flex-col gap-4 border-l-[5px] border-cian bg-carbon p-6 sm:flex-row sm:items-center sm:gap-5">
        <p className="flex-grow text-[15px] leading-relaxed text-gris sm:text-base">
          ¿Tienes dudas sobre el estudio? Escríbenos al {site.whatsapp.numero}.
        </p>
        <a
          href={site.whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="display flex shrink-0 items-center justify-center gap-2.5 bg-cian px-5 py-3 text-[16px] tracking-[0.06em] text-tinta transition-colors hover:bg-white"
        >
          <IconWhatsApp size={20} />
          Hablar por WhatsApp
        </a>
      </div>
    </section>
  );
}
