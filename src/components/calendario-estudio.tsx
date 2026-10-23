import {
  diaCorto,
  franjasDelDia,
  horaDe,
  primeraHora,
  rangoHoras,
  sumarDias,
  type Reserva,
  type TipoReserva,
} from "@/lib/estudio";

/**
 * La semana del estudio para el público, solo para mirar: en pantalla
 * grande una columna por día con lo ocupado como franjas; en el teléfono,
 * un renglón por día. Los días que ya pasaron quedan apagados.
 */

/** Alto de una hora en la grilla, en píxeles. */
const ALTO_HORA = 36;

/** La grilla arranca acá, salvo que haya algo más temprano. Termina a las 24. */
const HORA_INICIAL = 8;

const ESTILO_TIPO: Record<TipoReserva, string> = {
  renta: "rayado text-white",
  propio: "bg-morado text-white",
};

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Minutos del día -> "HH:MM". El final del día (1440) se escribe 00:00. */
function reloj(minutosDelDia: number): string {
  const m = minutosDelDia % 1440;
  return `${dosDigitos(Math.floor(m / 60))}:${dosDigitos(m % 60)}`;
}

export function CalendarioEstudio({
  lunes,
  hoy,
  reservas,
}: {
  lunes: string;
  hoy: string;
  reservas: Reserva[];
}) {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const porDia = dias.map((dia) => franjasDelDia(dia, reservas));

  const primera = primeraHora(lunes, reservas, HORA_INICIAL);
  const tope = primera * 60;
  const horas = Array.from({ length: 24 - primera }, (_, i) => primera + i);
  const alto = horas.length * ALTO_HORA;
  const arriba = (minutosDelDia: number) => ((minutosDelDia - tope) / 60) * ALTO_HORA;

  return (
    <>
      {/* Pantalla grande: la grilla. */}
      <div className="hidden overflow-x-auto overflow-y-hidden border-2 border-borde md:block">
        <div className="grid min-w-[680px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
          <div className="bg-humo" />
          {dias.map((dia) => (
            <div
              key={dia}
              className={`display border-l border-borde bg-humo px-2 py-2.5 text-[13px] tracking-[0.12em] ${
                dia === hoy ? "text-cian" : dia < hoy ? "text-gris-tenue" : "text-gris"
              }`}
            >
              {diaCorto(dia)}
              {dia === hoy && " · hoy"}
            </div>
          ))}

          <div className="relative border-t border-borde" style={{ height: alto }}>
            {horas.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 text-[11px] text-gris-tenue"
                style={{ top: i * ALTO_HORA + 3 }}
              >
                {dosDigitos(h)}:00
              </span>
            ))}
          </div>

          {dias.map((dia, i) => (
            <div
              key={dia}
              className={`relative border-l border-t border-borde ${
                dia === hoy ? "bg-cian/5" : ""
              } ${dia < hoy ? "opacity-40" : ""}`}
              style={{ height: alto }}
            >
              {horas.map((h) => (
                <div
                  key={h}
                  className="border-b border-borde/60"
                  style={{ height: ALTO_HORA }}
                />
              ))}
              {porDia[i].map((f) => {
                // La cola de una reserva de la noche anterior que termina
                // antes de que arranque la grilla va como una tira arriba.
                const colgante = f.hasta <= tope;
                const desde = Math.max(f.desde, tope);
                return (
                  <div
                    key={f.reserva.id}
                    className={`absolute inset-x-0.5 z-10 overflow-hidden px-1.5 py-1 text-[12px] leading-tight ${
                      ESTILO_TIPO[f.reserva.tipo]
                    }`}
                    style={
                      colgante
                        ? { top: 0, height: 20 }
                        : {
                            top: arriba(desde),
                            height: Math.max(((f.hasta - desde) / 60) * ALTO_HORA - 2, 14),
                          }
                    }
                    title={`${f.reserva.quien} · ${rangoHoras(f.reserva)}`}
                  >
                    {colgante ? (
                      <span className="display block truncate text-[11px] leading-[12px] tracking-[0.04em]">
                        ↑ {f.reserva.quien} hasta las {horaDe(f.reserva.hasta)}
                      </span>
                    ) : (
                      <>
                        <span className="display block truncate text-[12px] tracking-[0.04em]">
                          {f.reserva.quien}
                        </span>
                        <span className="opacity-80">{rangoHoras(f.reserva)}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Teléfono: un renglón por día. */}
      <ul className="divide-y-2 divide-borde border-2 border-borde md:hidden">
        {dias.map((dia, i) => (
          <li
            key={dia}
            className={`flex gap-4 px-4 py-3.5 ${dia === hoy ? "bg-cian/5" : ""} ${
              dia < hoy ? "opacity-40" : ""
            }`}
          >
            <p
              className={`display w-16 shrink-0 pt-1 text-[15px] tracking-[0.08em] ${
                dia === hoy ? "text-cian" : "text-white"
              }`}
            >
              {diaCorto(dia)}
              {dia === hoy && (
                <span className="mt-1 block text-[11px] tracking-[0.14em]">Hoy</span>
              )}
            </p>
            {porDia[i].length === 0 ? (
              <p className="pt-0.5 text-[15px] text-gris">Libre todo el día</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {porDia[i].map((f) => (
                  <li
                    key={f.reserva.id}
                    className={`px-2.5 py-1.5 text-[13px] ${ESTILO_TIPO[f.reserva.tipo]}`}
                  >
                    <span className="font-bold">
                      {reloj(f.desde)}–{reloj(f.hasta)}
                    </span>{" "}
                    {f.reserva.quien}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-gris-suave">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-3 border border-borde" />
          Libre
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="rayado inline-block size-3" />
          Ocupado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-3 bg-morado" />
          Programa del canal
        </span>
        <span>Horario de Mérida.</span>
      </p>
    </>
  );
}
