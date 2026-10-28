import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { conceptosSesion, validarSesion, finSesion, type ConfiguracionEstudio } from "./carrito-estudio";
import { lunesDe, sumarDias } from "./estudio";

export class ErrorPago extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface ContactoPedido { nombre: string; correo: string; telefono: string; notas: string }
export interface SesionPedido {
  configuracion: ConfiguracionEstudio;
  desde: string;
  hasta: string;
  conceptos: { nombre: string; cantidad: number; unidad: string; precioCentavos: number; subtotalCentavos: number }[];
  totalCentavos: number;
}
export interface DatosPedido { contacto: ContactoPedido; sesiones: SesionPedido[]; totalCentavos: number; huella: string }
export const esUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export const hashToken = (s: string) => createHash("sha256").update(s).digest("hex");

export function fechaHoraMerida(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ahora);
  const p = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:${p("minute")}`;
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErrorPago("Revisa los datos de tu pedido.");
  return valor as Record<string, unknown>;
}
function texto(d: Record<string, unknown>, campo: string, max: number, min = 0) {
  const valor = d[campo];
  if (typeof valor !== "string" || valor.trim().length < min || valor.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(valor)) throw new ErrorPago(`Revisa el campo ${campo}.`);
  return valor.trim();
}
export function validarPedido(entrada: unknown, ahora = new Date()): DatosPedido {
  const datos = objeto(entrada);
  const c = objeto(datos.contacto);
  const contacto = { nombre: texto(c, "nombre", 120, 2), correo: texto(c, "correo", 180, 3).toLowerCase(), telefono: texto(c, "telefono", 25, 7), notas: texto(c, "notas", 1000) };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.correo)) throw new ErrorPago("Revisa tu correo electrónico.");
  if (!/^[+\d\s().-]+$/.test(contacto.telefono) || contacto.telefono.replace(/\D/g, "").length < 7) throw new ErrorPago("Revisa tu teléfono.");
  if (!Array.isArray(datos.sesiones) || datos.sesiones.length < 1 || datos.sesiones.length > 50) throw new ErrorPago("El carrito debe contener entre 1 y 50 sesiones.");
  const instante = fechaHoraMerida(ahora);
  const hoy = instante.slice(0, 10);
  const anteriores: (ConfiguracionEstudio & { id: string })[] = [];
  const sesiones = datos.sesiones.map((valor, i): SesionPedido => {
    const s = objeto(valor);
    // Se seleccionan campos explícitamente. Nunca se aceptan precios ni totales del navegador.
    if (typeof s.fecha !== "string" || typeof s.inicio !== "string") throw new ErrorPago("Revisa la fecha y hora de la sesión.");
    const configuracion = { fecha: s.fecha, inicio: s.inicio, horas: s.horas, tecnico: s.tecnico, transmision: s.transmision, operadoresExtra: s.operadoresExtra, ediciones: s.ediciones, paquetesClips: s.paquetesClips } as ConfiguracionEstudio;
    const error = validarSesion(configuracion, { hoy, ultimaFecha: sumarDias(lunesDe(hoy), 62), ahora: instante, reservas: [], carrito: anteriores });
    if (error) throw new ErrorPago(`Sesión ${i + 1}: ${error}`);
    anteriores.push({ ...configuracion, id: String(i) });
    const conceptos = conceptosSesion(configuracion).map(c => ({ nombre: c.nombre, cantidad: c.cantidad, unidad: c.unidad, precioCentavos: c.precio * 100, subtotalCentavos: c.subtotal * 100 }));
    return { configuracion, desde: `${configuracion.fecha} ${configuracion.inicio}`, hasta: `${configuracion.fecha} ${finSesion(configuracion)}`, conceptos, totalCentavos: conceptos.reduce((n, c) => n + c.subtotalCentavos, 0) };
  });
  const totalCentavos = sesiones.reduce((n, s) => n + s.totalCentavos, 0);
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0) throw new ErrorPago("El total del pedido no es válido.");
  return { contacto, sesiones, totalCentavos, huella: hashToken(JSON.stringify({ contacto, sesiones })) };
}

/** La firma cubre data.id de la URL, nunca un ID tomado del cuerpo sin firmar. */
export function firmaWebhookValida(firma: string | null, requestId: string | null, dataId: string, secreto: string): boolean {
  if (!firma || !requestId || requestId.length > 200 || !secreto || !/^[a-z0-9-]{1,100}$/i.test(dataId)) return false;
  const partes = firma.split(",").map(s => s.trim().split("="));
  const ts = partes.find(([k]) => k === "ts")?.[1];
  const firmas = partes.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!ts || !/^\d{10,16}$/.test(ts)) return false;
  // Los reintentos se autentican y son idempotentes; no se rechazan por antigüedad del evento.
  const esperado = createHmac("sha256", secreto).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest();
  return firmas.some(v => /^[a-f0-9]{64}$/i.test(v ?? "") && timingSafeEqual(esperado, Buffer.from(v, "hex")));
}

export interface PagoMP {
  id: number | string; status: string; status_detail?: string; external_reference: string;
  transaction_amount: number; currency_id: string; collector_id: number; live_mode: boolean;
  date_approved?: string | null; date_last_updated: string;
  transaction_amount_refunded?: number;
}
export function validarPagoMP(p: PagoMP, pedido: { id: string; total_centavos: number }, vendedor: string, produccion: boolean) {
  if (p.external_reference !== pedido.id || p.currency_id !== "MXN" || Math.round(p.transaction_amount * 100) !== pedido.total_centavos || !Number.isFinite(p.transaction_amount) || String(p.collector_id) !== vendedor || p.live_mode !== produccion || !Number.isFinite(Date.parse(p.date_last_updated))) {
    throw new ErrorPago("El pago no coincide con el pedido o el comercio.", 422);
  }
}
