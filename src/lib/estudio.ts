/**
 * Reservas del estudio.
 *
 * El estudio es uno solo y lo ocupan los programas del canal o quien lo
 * renta. Las reservas se manejan en el admin; el sitio público muestra la
 * ocupación en modo lectura, sin el nombre de quien renta ni las notas.
 *
 * Las horas se guardan y se manejan en hora de Mérida tal cual se escriben
 * ("2026-10-26 22:00"), sin pasar por `Date` ni por zonas horarias: el
 * servidor corre en UTC y Mérida no cambia de horario, así que convertir
 * solo serviría para correr los horarios. Con el formato fijo, comparar dos
 * instantes es comparar los textos.
 *
 * Este módulo no toca la base: son tipos y cuentas de fechas que también
 * pueden usarse desde componentes de cliente.
 */

export type TipoReserva = "renta" | "propio";

export interface Reserva {
  id: number;
  /** Quién ocupa el estudio: el programa del canal o el cliente que renta. */
  quien: string;
  tipo: TipoReserva;
  /** Inicio, "YYYY-MM-DD HH:MM" en hora de Mérida. */
  desde: string;
  /** Fin, mismo formato. Puede caer en el día siguiente (pasa de medianoche). */
  hasta: string;
  notas?: string;
}

export const NOMBRE_TIPO: Record<TipoReserva, string> = {
  renta: "Renta",
  propio: "Programa del canal",
};

export const ZONA = "America/Merida";

export const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const ES_HORA = /^\d{2}:\d{2}$/;

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

// --- Fechas -------------------------------------------------------------------

/** La fecha de hoy en Mérida, "YYYY-MM-DD". */
export function hoyEnMerida(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

// Las cuentas de días se hacen en UTC a propósito: así el día nunca se corre
// por la zona horaria del servidor.
function aUtc(iso: string): Date {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Formato correcto y día que existe: "2026-02-30" no pasa. */
export function fechaValida(iso: string): boolean {
  return ES_FECHA.test(iso) && aIso(aUtc(iso)) === iso;
}

export function horaValida(hora: string): boolean {
  if (!ES_HORA.test(hora)) return false;
  const [h, m] = hora.split(":").map(Number);
  return h < 24 && m < 60;
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = aUtc(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aIso(fecha);
}

/** 0 = lunes … 6 = domingo. */
function diaDeSemana(iso: string): number {
  return (aUtc(iso).getUTCDay() + 6) % 7;
}

/** El lunes de la semana a la que pertenece la fecha. */
export function lunesDe(iso: string): string {
  return sumarDias(iso, -diaDeSemana(iso));
}

// --- Horas --------------------------------------------------------------------

/** "22:30" -> 1350. */
export function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** "23:00" + 1 -> "00:00". */
export function sumarHoras(hora: string, horas: number): string {
  const total = (minutos(hora) + horas * 60 + 1440) % 1440;
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** El día de un instante: "2026-10-26 22:00" -> "2026-10-26". */
export function diaDe(instante: string): string {
  return instante.slice(0, 10);
}

/** La hora de un instante: "2026-10-26 22:00" -> "22:00". */
export function horaDe(instante: string): string {
  return instante.slice(11);
}

/**
 * Minutos desde las 00:00 de `dia` hasta el instante, para ubicar una franja
 * en la columna de ese día. Si el instante ya es del día siguiente (una
 * reserva que termina a medianoche), devuelve 1440: el final del día.
 */
export function minutosEnDia(instante: string, dia: string): number {
  return diaDe(instante) === dia ? minutos(horaDe(instante)) : 1440;
}

// --- Grilla de la semana ------------------------------------------------------

export interface Franja {
  reserva: Reserva;
  /** Minutos desde las 00:00 del día de la columna. */
  desde: number;
  hasta: number;
}

/**
 * Lo que de cada reserva cae dentro de un día. Una que pasa de medianoche
 * aparece en dos columnas: hasta las 24:00 en la primera y desde las 00:00
 * en la siguiente.
 */
export function franjasDelDia(dia: string, reservas: Reserva[]): Franja[] {
  const inicioDia = `${dia} 00:00`;
  const finDia = `${sumarDias(dia, 1)} 00:00`;
  return reservas.flatMap((r) => {
    const desde = r.desde > inicioDia ? r.desde : inicioDia;
    const hasta = r.hasta < finDia ? r.hasta : finDia;
    if (desde >= hasta) return [];
    return [
      {
        reserva: r,
        desde: minutosEnDia(desde, dia),
        hasta: minutosEnDia(hasta, dia),
      },
    ];
  });
}

/**
 * La hora en que arranca la grilla: `minima`, salvo que una reserva de la
 * semana empiece antes. Lo que viene colgando de la noche anterior (termina
 * a las 00:30, digamos) no cuenta.
 */
export function primeraHora(lunes: string, reservas: Reserva[], minima: number): number {
  return Math.min(
    minima,
    ...reservas
      .filter((r) => diaDe(r.desde) >= lunes)
      .map((r) => Math.floor(minutos(horaDe(r.desde)) / 60)),
  );
}

// --- Etiquetas ----------------------------------------------------------------

/** "2026-10-26" -> "lun 26". */
export function diaCorto(iso: string): string {
  return `${DIAS[diaDeSemana(iso)]} ${Number(iso.slice(8))}`;
}

/** "2026-10-26" -> "lun 26 oct". */
export function diaLargo(iso: string): string {
  return `${diaCorto(iso)} ${MESES[Number(iso.slice(5, 7)) - 1]}`;
}

/** "22:00–00:00", o "22:00–01:00 (día sig.)" cuando pasa de medianoche. */
export function rangoHoras(r: Pick<Reserva, "desde" | "hasta">): string {
  const base = `${horaDe(r.desde)}–${horaDe(r.hasta)}`;
  const pasaDeDia = diaDe(r.hasta) !== diaDe(r.desde) && horaDe(r.hasta) !== "00:00";
  return pasaDeDia ? `${base} (día sig.)` : base;
}

/** "26 oct – 1 nov 2026", o "5 – 11 oct 2026" si no cambia de mes. */
export function rangoSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  const [, mesInicio, diaInicio] = lunes.split("-");
  const [anioFin, mesFin, diaFin] = domingo.split("-");
  const inicio =
    mesInicio === mesFin
      ? `${Number(diaInicio)}`
      : `${Number(diaInicio)} ${MESES[Number(mesInicio) - 1]}`;
  return `${inicio} – ${Number(diaFin)} ${MESES[Number(mesFin) - 1]} ${anioFin}`;
}

/** Una reserva en una línea, para los avisos: "Fantoches, lun 26 oct 22:00–00:00". */
export function describirReserva(r: Pick<Reserva, "quien" | "desde" | "hasta">): string {
  return `${r.quien}, ${diaLargo(diaDe(r.desde))} ${rangoHoras(r)}`;
}
