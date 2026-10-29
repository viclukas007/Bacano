import { fechaValida, horaValida, minutos, sumarHoras, type Reserva } from "./estudio";

/** Catálogo del frontend. El backend deberá usar precios propios y recalcular. */
export const TARIFAS = {
  primeraHora: 1100,
  horaExtra: 700,
  transmision: 200,
  edicion: 3000,
  reels: 1000,
} as const;

/** v2 desde los precios de oct-2026: los carritos v1 traen servicios que ya no existen. */
export const CLAVE_CARRITO = "bacano:carrito-estudio:v2";
export const APERTURA = 8;
export const CIERRE = 21;
export const MAX_UNIDADES = 20;
/**
 * Tope por pedido en línea: lo que necesita una grabación real. Sin él, dos
 * carritos de 50 sesiones de 13 h bastaban para apartar el calendario entero
 * sin pagar. Para más horas, el estudio atiende por WhatsApp.
 */
export const MAX_SESIONES_PEDIDO = 6;
export const MAX_HORAS_PEDIDO = 26;
export const horasCarrito = (sesiones: ConfiguracionEstudio[]) => sesiones.reduce((total, s) => total + s.horas, 0);

export interface SesionEstudio {
  id: string;
  fecha: string;
  inicio: string;
  horas: number;
  transmision: boolean;
  ediciones: number;
  paquetesReels: number;
}

export type ConfiguracionEstudio = Omit<SesionEstudio, "id">;
export interface ConceptoEstudio {
  nombre: string;
  cantidad: number;
  unidad: string;
  precio: number;
  subtotal: number;
}

const moneda = new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", maximumFractionDigits: 0,
});
export const pesos = (valor: number) => moneda.format(valor);
export const horaEtiqueta = (hora: number) => `${String(hora).padStart(2, "0")}:00`;
export const finSesion = (sesion: ConfiguracionEstudio) => sumarHoras(sesion.inicio, sesion.horas);

export function conceptosSesion(s: ConfiguracionEstudio): ConceptoEstudio[] {
  const filas: [string, number, string, number][] = [
    ["Renta del estudio", 1, "h", TARIFAS.primeraHora],
    ["Hora extra de estudio", s.horas - 1, "h", TARIFAS.horaExtra],
    ["Transmisión en vivo", s.transmision ? 1 : 0, "sesión", TARIFAS.transmision],
    ["Edición de programa", s.ediciones, "programa(s)", TARIFAS.edicion],
    ["Paquete de 4 reels", s.paquetesReels, "paquete(s)", TARIFAS.reels],
  ];
  return filas.filter(([, cantidad]) => cantidad > 0).map(([nombre, cantidad, unidad, precio]) => ({
    nombre, cantidad, unidad, precio, subtotal: cantidad * precio,
  }));
}

export function totalSesion(s: ConfiguracionEstudio): number {
  return conceptosSesion(s).reduce((total, c) => total + c.subtotal, 0);
}

/** No consulta servicios externos: solo ayuda visual con la ocupación conocida. */
export function validarSesion(
  s: ConfiguracionEstudio,
  opciones: { hoy: string; ultimaFecha: string; ahora?: string; reservas: Reserva[]; carrito: SesionEstudio[]; omitirId?: string },
): string | null {
  if (!fechaValida(s.fecha) || s.fecha < opciones.hoy || s.fecha > opciones.ultimaFecha) {
    return "Elige una fecha dentro del periodo disponible.";
  }
  if (!horaValida(s.inicio) || minutos(s.inicio) % 60 !== 0) return "Elige una hora de inicio válida.";
  const inicio = minutos(s.inicio) / 60;
  if (!Number.isInteger(s.horas) || s.horas < 1 || inicio < APERTURA || inicio + s.horas > CIERRE) {
    return "La sesión debe estar entre las 08:00 y las 21:00 y durar al menos una hora.";
  }
  if (![s.ediciones, s.paquetesReels].every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_UNIDADES)) {
    return `Las cantidades deben estar entre 0 y ${MAX_UNIDADES}.`;
  }
  if (typeof s.transmision !== "boolean") return "Revisa los servicios seleccionados.";
  const desde = `${s.fecha} ${s.inicio}`;
  const hasta = `${s.fecha} ${finSesion(s)}`;
  if (opciones.ahora && desde <= opciones.ahora) return "Ese horario ya pasó. Elige una hora posterior.";
  if (opciones.reservas.some((r) => desde < r.hasta && hasta > r.desde)) return "Ese horario está ocupado en el calendario. Prueba con otro.";
  if (opciones.carrito.some((r) => r.id !== opciones.omitirId && desde < `${r.fecha} ${finSesion(r)}` && hasta > `${r.fecha} ${r.inicio}`)) {
    return "Esta sesión se cruza con otra de tu carrito. Ajusta el horario.";
  }
  return null;
}

/**
 * Recuperar datos locales no significa confiar en ellos ni reservar el horario.
 * Con `ahora` se descartan las sesiones que ya empezaron: no se pueden pagar y
 * solo inflaban el total de alguien que vuelve días después.
 */
export function leerCarrito(texto: string | null, ahora?: string): SesionEstudio[] {
  try {
    const datos: unknown = JSON.parse(texto ?? "[]");
    if (!Array.isArray(datos) || datos.length > 50) return [];
    const ids = new Set<string>();
    return datos.filter((dato): dato is SesionEstudio => {
      if (!dato || typeof dato !== "object") return false;
      const s = dato as SesionEstudio;
      if (typeof s.id !== "string" || !s.id || ids.has(s.id)) return false;
      if (typeof s.fecha !== "string" || typeof s.inicio !== "string") return false;
      if (validarSesion(s, { hoy: ahora?.slice(0, 10) ?? "2000-01-01", ultimaFecha: "9999-12-31", ahora, reservas: [], carrito: [] })) return false;
      ids.add(s.id);
      return true;
    }).slice(0, MAX_SESIONES_PEDIDO);
  } catch { return []; }
}
