import { ErrorPago, type PagoMP } from "./pagos-estudio-reglas";

export interface ConfigPago { token: string; secreto: string; vendedor: string; appUrl: string; produccion: boolean; minutos: number }
export function configuracionPago(): ConfigPago {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";
  const vendedor = process.env.MERCADOPAGO_COLLECTOR_ID ?? "";
  const modo = process.env.MERCADOPAGO_ENV;
  const minutos = Number(process.env.ESTUDIO_APARTADO_MINUTOS ?? 15);
  let url: URL;
  try { url = new URL(process.env.APP_URL ?? ""); } catch { throw new ErrorPago("El pago en línea todavía no está habilitado.", 503); }
  if (process.env.MERCADOPAGO_ENABLED !== "true" || !token || !secreto || !/^\d+$/.test(vendedor) || !["test", "production"].includes(modo ?? "") || !Number.isInteger(minutos) || minutos < 5 || minutos > 60 || url.username || url.password || url.pathname !== "/" || url.search || url.hash || (url.protocol !== "https:" && !(modo === "test" && url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))) {
    throw new ErrorPago("El pago en línea todavía no está habilitado.", 503);
  }
  return { token, secreto, vendedor, appUrl: url.origin, produccion: modo === "production", minutos };
}
export function pagosHabilitados() { try { configuracionPago(); return true; } catch { return false; } }

// Fallos del proveedor como 503 y no 502: el proxy de EasyPanel sustituye los
// 502 por su propia página HTML y el navegador se queda sin el mensaje ni la cookie.
const PROVEEDOR_FALLO = 503;

async function pedir<T>(ruta: string, config: ConfigPago, body?: unknown, clave?: string): Promise<T> {
  // URL fija: jamás se consulta una URL enviada por el webhook o el navegador.
  let respuesta: Response;
  try {
    respuesta = await fetch(`https://api.mercadopago.com${ruta}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", ...(clave ? { "X-Idempotency-Key": clave } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(10000) });
  } catch { throw new ErrorPago("No pudimos comunicarnos con Mercado Pago. Intenta de nuevo.", PROVEEDOR_FALLO); }
  if (!respuesta.ok) {
    // Solo el código y el tipo de error: nunca el cuerpo completo, que puede traer datos del pago.
    const detalle = await respuesta.json().then((j: { error?: string; message?: string }) => j?.error ?? j?.message ?? "").catch(() => "");
    console.error(`[pagos] Mercado Pago respondió ${respuesta.status} en ${ruta.split("?")[0]}${detalle ? `: ${String(detalle).slice(0, 120)}` : ""}`);
    throw new ErrorPago("Mercado Pago no pudo procesar la solicitud. Intenta de nuevo.", PROVEEDOR_FALLO);
  }
  return respuesta.json() as Promise<T>;
}
export async function crearPreferencia(pedido: { id: string; total_centavos: number; correo: string; expira_en: Date | string }, config: ConfigPago) {
  const retorno = `${config.appUrl}/estudio/pago?pedido=${pedido.id}`;
  const resultado = await pedir<{ id: string; init_point: string; collector_id?: number }>("/checkout/preferences", config, {
    items: [{ id: pedido.id, title: "Reserva de estudio Bacano", currency_id: "MXN", quantity: 1, unit_price: pedido.total_centavos / 100 }],
    payer: { email: pedido.correo }, external_reference: pedido.id,
    back_urls: { success: retorno, pending: retorno, failure: retorno }, auto_return: "approved",
    notification_url: `${config.appUrl}/api/mercadopago/webhook`,
    expires: true, expiration_date_from: new Date().toISOString(), expiration_date_to: new Date(pedido.expira_en).toISOString(),
    // Los medios diferidos pueden aprobarse después del apartado; se excluyen en esta versión.
    payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }], default_installments: 1 },
  }, pedido.id);
  // El vendedor de la preferencia es el dueño del token. Si no es el de
  // MERCADOPAGO_COLLECTOR_ID, cada pago llegaría y se rechazaría en
  // validarPagoMP (pasó el 28-oct-2026 con el ID de la app en esa variable):
  // mejor no cobrar. El apartado se conserva y vence solo.
  if (String(resultado.collector_id ?? "") !== config.vendedor) {
    console.error(`[pagos] la preferencia del pedido ${pedido.id} es del vendedor ${resultado.collector_id ?? "desconocido"} y MERCADOPAGO_COLLECTOR_ID es ${config.vendedor}: no se entrega el checkout`);
    throw new ErrorPago("El cobro en línea no está disponible por ahora. Escríbenos por WhatsApp para reservar.", PROVEEDOR_FALLO);
  }
  // Siempre init_point: con las credenciales de prueba actuales el checkout de
  // prueba corre en www.mercadopago.com.mx; sandbox_init_point es el modelo
  // viejo y responde "algo salió mal".
  const checkout = resultado.init_point;
  let url: URL;
  try { url = new URL(checkout); } catch { throw new ErrorPago("Mercado Pago devolvió un checkout inválido.", PROVEEDOR_FALLO); }
  if (!resultado.id || url.protocol !== "https:" || !(url.hostname === "mercadopago.com.mx" || url.hostname.endsWith(".mercadopago.com.mx"))) throw new ErrorPago("Mercado Pago devolvió un checkout inválido.", PROVEEDOR_FALLO);
  return { id: resultado.id, checkout: url.toString() };
}
export async function consultarPago(id: string, config: ConfigPago): Promise<PagoMP> {
  if (!/^\d{1,30}$/.test(id)) throw new ErrorPago("Identificador de pago inválido.");
  return pedir<PagoMP>(`/v1/payments/${id}`, config);
}
export async function buscarPagos(pedido: string, config: ConfigPago) {
  const r = await pedir<{ results: PagoMP[] }>(`/v1/payments/search?external_reference=${encodeURIComponent(pedido)}&sort=date_created&criteria=desc&limit=50`, config);
  return r.results;
}
