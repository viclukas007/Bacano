import { fechaValida, horaValida, minutos, sumarHoras, type Reserva } from "./estudio";

/** Catálogo del frontend. El backend deberá usar precios propios y recalcular. */
export const TARIFAS = {
  estudio: 480,
  tecnico: 250,
  transmision: 100,
  operadorExtra: 150,
  edicion: 1500,
  clips: 1000,
} as const;

export const APERTURA = 8;
export const CIERRE = 21;
export const MAX_UNIDADES = 20;

export interface SesionEstudio {
  id: string;
  fecha: string;
  inicio: string;
  horas: number;
  tecnico: boolean;
  transmision: boolean;
  operadoresExtra: number;
  ediciones: number;
  paquetesClips: number;
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
    ["Renta del estudio", s.horas, "h", TARIFAS.estudio],
    ["Técnico/operador", s.tecnico ? s.horas : 0, "h", TARIFAS.tecnico],
    ["Transmisión en vivo", s.transmision ? s.horas : 0, "h", TARIFAS.transmision],
    ["Operador extra", s.operadoresExtra * s.horas, "h de operador", TARIFAS.operadorExtra],
    ["Edición de episodio", s.ediciones, "episodio(s)", TARIFAS.edicion],
    ["Paquete de 10 clips", s.paquetesClips, "paquete(s)", TARIFAS.clips],
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
  if (![s.operadoresExtra, s.ediciones, s.paquetesClips].every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_UNIDADES)) {
    return `Las cantidades deben estar entre 0 y ${MAX_UNIDADES}.`;
  }
  if (typeof s.tecnico !== "boolean" || typeof s.transmision !== "boolean") return "Revisa los servicios seleccionados.";
  const desde = `${s.fecha} ${s.inicio}`;
  const hasta = `${s.fecha} ${finSesion(s)}`;
  if (opciones.ahora && desde <= opciones.ahora) return "Ese horario ya pasó. Elige una hora posterior.";
  if (opciones.reservas.some((r) => desde < r.hasta && hasta > r.desde)) return "Ese horario está ocupado en el calendario. Prueba con otro.";
  if (opciones.carrito.some((r) => r.id !== opciones.omitirId && desde < `${r.fecha} ${finSesion(r)}` && hasta > `${r.fecha} ${r.inicio}`)) {
    return "Esta sesión se cruza con otra de tu carrito. Ajusta el horario.";
  }
  return null;
}

/** Recuperar datos locales no significa confiar en ellos ni reservar el horario. */
export function leerCarrito(texto: string | null): SesionEstudio[] {
  try {
    const datos: unknown = JSON.parse(texto ?? "[]");
    if (!Array.isArray(datos) || datos.length > 50) return [];
    const ids = new Set<string>();
    return datos.filter((dato): dato is SesionEstudio => {
      if (!dato || typeof dato !== "object") return false;
      const s = dato as SesionEstudio;
      if (typeof s.id !== "string" || !s.id || ids.has(s.id)) return false;
      if (typeof s.fecha !== "string" || typeof s.inicio !== "string") return false;
      if (validarSesion(s, { hoy: "2000-01-01", ultimaFecha: "9999-12-31", reservas: [], carrito: [] })) return false;
      ids.add(s.id);
      return true;
    });
  } catch { return []; }
}
