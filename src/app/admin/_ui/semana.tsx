import Link from "next/link";
import {
  diaCorto,
  diaDe,
  diaLargo,
  franjasDelDia,
  horaDe,
  NOMBRE_TIPO,
  primeraHora,
  rangoHoras,
  sumarDias,
  type Reserva,
  type TipoReserva,
} from "@/lib/estudio";

/**
 * La semana del estudio: una columna por día con las reservas como franjas,
 * y debajo la misma semana en lista (que es lo que se lee cómodo en el
 * teléfono). Hacer clic en un hueco abre una reserva nueva a esa hora; hacer
 * clic en una franja la abre para editarla.
 */

/** Alto de una hora en la grilla, en píxeles. */
const ALTO_HORA = 44;

/** La grilla arranca acá, salvo que haya algo más temprano. Termina a las 24. */
const HORA_INICIAL = 7;

const ESTILO_TIPO: Record<TipoReserva, string> = {
  renta: "bg-cian text-tinta hover:bg-white",
  propio: "bg-morado text-white hover:bg-morado-claro hover:text-morado-tinta",
};

const PUNTO_TIPO: Record<TipoReserva, string> = {
  renta: "bg-cian",
  propio: "bg-morado",
};

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function Semana({
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
      {/* overflow-y oculto: la cabecera mide fracciones de píxel y si no, sale
          una barra de scroll vertical de un píxel. */}
      <div className="overflow-x-auto overflow-y-hidden border-2 border-borde">
        <div className="grid min-w-[860px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          {/* Cabecera: los días. */}
          <div className="bg-humo" />
          {dias.map((dia) => (
            <div
              key={dia}
              className={`display border-l border-borde bg-humo px-2 py-2.5 text-[12px] tracking-[0.12em] ${
                dia === hoy ? "text-cian" : "text-gris"
              }`}
            >
              {diaCorto(dia)}
              {dia === hoy && " · hoy"}
            </div>
          ))}

          {/* Columna de horas. */}
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

          {/* Una columna por día: huecos clicables y, encima, las franjas. */}
          {dias.map((dia, i) => (
            <div
              key={dia}
              className={`relative border-l border-t border-borde ${
                dia === hoy ? "bg-cian/5" : ""
              }`}
              style={{ height: alto }}
            >
              {horas.map((h) => (
                <Link
                  key={h}
                  href={`/admin/estudio/nueva?fecha=${dia}&inicio=${dosDigitos(h)}:00`}
                  className="block border-b border-borde/60 hover:bg-humo"
                  style={{ height: ALTO_HORA }}
                  aria-label={`Reservar el ${diaLargo(dia)} a las ${dosDigitos(h)}:00`}
                />
              ))}
              {porDia[i].map((f) => {
                // Lo que termina antes de que arranque la grilla (la cola de
                // una reserva de la noche anterior) va como una tira arriba.
                const colgante = f.hasta <= tope;
                const desde = Math.max(f.desde, tope);
                return (
                  <Link
                    key={f.reserva.id}
                    href={`/admin/estudio/${f.reserva.id}`}
                    className={`absolute inset-x-0.5 z-10 overflow-hidden px-1.5 py-1 text-[12px] leading-tight transition-colors ${
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
                        <span className="display block text-[12px] tracking-[0.04em]">
                          {f.reserva.quien}
                        </span>
                        <span className="opacity-80">{rangoHoras(f.reserva)}</span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-gris-suave">
        {(Object.keys(NOMBRE_TIPO) as TipoReserva[]).map((tipo) => (
          <span key={tipo} className="inline-flex items-center gap-2">
            <span className={`inline-block size-3 ${PUNTO_TIPO[tipo]}`} />
            {NOMBRE_TIPO[tipo]}
          </span>
        ))}
        <span>Haz clic en un hueco para reservar a esa hora.</span>
      </p>
    </>
  );
}

export function ListaSemana({ reservas }: { reservas: Reserva[] }) {
  return (
    <div className="overflow-x-auto border-2 border-borde">
      <table className="w-full min-w-[600px] text-left text-[14px]">
        <thead className="display bg-humo text-[12px] tracking-[0.12em] text-cian">
          <tr>
            <th className="px-4 py-3">Día</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3">Quién</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Notas</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => (
            <tr key={r.id} className="border-t border-borde text-white">
              <td className="whitespace-nowrap px-4 py-3">{diaLargo(diaDe(r.desde))}</td>
              <td className="whitespace-nowrap px-4 py-3">{rangoHoras(r)}</td>
              <td className="px-4 py-3">{r.quien}</td>
              <td className="px-4 py-3 text-gris">{NOMBRE_TIPO[r.tipo]}</td>
              <td className="max-w-[320px] truncate px-4 py-3 text-gris" title={r.notas}>
                {r.notas}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/estudio/${r.id}`} className="text-cian hover:underline">
                  Editar
                </Link>
              </td>
            </tr>
          ))}
          {reservas.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gris">
                Nada reservado esta semana.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
