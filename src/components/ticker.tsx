import { getShows } from "@/lib/content";

/**
 * Marquesina con los nombres de los programas.
 *
 * La pista lleva el listado dos veces y se desplaza exactamente la mitad,
 * así el bucle no tiene costura. La segunda copia es decorativa, por eso va
 * oculta para los lectores de pantalla.
 */
export async function Ticker() {
  const shows = await getShows();
  const secuencia = [...shows, ...shows, ...shows].map((s) => s.nombre);

  return (
    <div className="overflow-hidden bg-cian py-3.5">
      <div className="ticker-pista flex w-max">
        {[0, 1].map((copia) => (
          <p
            key={copia}
            aria-hidden={copia === 1}
            className="display flex shrink-0 gap-6 whitespace-nowrap pr-6 text-[18px] tracking-[0.06em] text-tinta sm:text-[22px]"
          >
            {secuencia.map((nombre, i) => (
              <span key={`${copia}-${i}`}>
                {nombre}
                <span aria-hidden className="pl-6">
                  ·
                </span>
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
