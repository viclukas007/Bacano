/* eslint-disable @typescript-eslint/no-require-imports */
require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHmac, randomUUID } = require("node:crypto");
const { validarPedido, validarPagoMP, firmaWebhookValida } = require("../src/lib/pagos-estudio-reglas.ts");
const { configuracionPago } = require("../src/lib/mercado-pago.ts");
const ahora = new Date("2026-10-25T18:00:00Z");
const contacto = { nombre: "Cliente de prueba", correo: "CLIENTE@example.com", telefono: "+52 999 123 4567", notas: "Podcast" };
const sesion = { fecha: "2026-11-02", inicio: "08:00", horas: 1, transmision: false, ediciones: 0, paquetesReels: 0 };
test("el servidor ignora precios y totales manipulados y congela los conceptos", () => {
  const pedido = validarPedido({ contacto, sesiones: [{ ...sesion, precio: 1, total: 1 }], total: 1 }, ahora);
  assert.equal(pedido.totalCentavos, 110000);
  assert.equal(pedido.sesiones[0].conceptos[0].precioCentavos, 110000);
  assert.equal(pedido.contacto.correo, "cliente@example.com");
});
test("validación estricta de contacto, cantidades, tipos, fechas y sesiones", () => {
  for (const entrada of [null, {}, { contacto, sesiones: [] }, { contacto, sesiones: Array(51).fill(sesion) }, { contacto: { ...contacto, correo: "mal" }, sesiones: [sesion] }, { contacto: { ...contacto, telefono: "abcdefg" }, sesiones: [sesion] }, ...[{ horas: "1" }, { transmision: "true" }, { paquetesReels: 21 }, { fecha: "2026-02-30" }, { inicio: "21:00" }, { fecha: "2026-10-25", inicio: "12:00" }, { fecha: "2027-01-01" }].map(c => ({ contacto, sesiones: [{ ...sesion, ...c }] }))]) {
    assert.throws(() => validarPedido(entrada, ahora));
  }
});
test("limita sesiones y horas por pedido: 6 sesiones o 26 horas, lo que necesita una grabación", () => {
  const horas = (n, h = 1) => Array.from({ length: n }, (_, i) => ({ ...sesion, inicio: `${String(8 + i).padStart(2, "0")}:00`, horas: h }));
  assert.equal(validarPedido({ contacto, sesiones: horas(6) }, ahora).sesiones.length, 6);
  assert.throws(() => validarPedido({ contacto, sesiones: horas(7) }, ahora), /entre 1 y 6/);
  const dosDias = [{ ...sesion, horas: 13 }, { ...sesion, fecha: "2026-11-03", horas: 13 }];
  assert.equal(validarPedido({ contacto, sesiones: dosDias }, ahora).totalCentavos, 2 * (1100 + 12 * 700) * 100);
  assert.throws(() => validarPedido({ contacto, sesiones: [...dosDias, { ...sesion, fecha: "2026-11-04" }] }, ahora), /hasta 26 horas/);
});
test("rechaza traslapes y permite sesiones contiguas", () => {
  assert.throws(() => validarPedido({ contacto, sesiones: [sesion, sesion] }, ahora), /cruza/);
  assert.equal(validarPedido({ contacto, sesiones: [sesion, { ...sesion, inicio: "09:00" }] }, ahora).totalCentavos, 220000);
});
test("la huella es estable e incluye servicios y contacto", () => {
  const a = validarPedido({ contacto, sesiones: [sesion] }, ahora);
  assert.equal(a.huella, validarPedido({ contacto, sesiones: [{ ...sesion, total: 0 }] }, ahora).huella);
  assert.notEqual(a.huella, validarPedido({ contacto, sesiones: [{ ...sesion, transmision: true }] }, ahora).huella);
});
test("autentica HMAC y rechaza ID, firma, request-id o secreto alterados", () => {
  const ts = "1792951200000";
  const firma = createHmac("sha256", "secreto").update(`id:123;request-id:req-1;ts:${ts};`).digest("hex");
  const header = `ts=${ts},v1=${firma}`;
  assert.equal(firmaWebhookValida(header, "req-1", "123", "secreto"), true);
  for (const args of [[header,"req-1","124","secreto"], [header,"req-2","123","secreto"], [header,"req-1","123","otro"], ["ts=123,v1=no", "req-1", "123", "secreto"], [null,"req-1","123","secreto"]]) assert.equal(firmaWebhookValida(...args), false);
});
test("un pago debe coincidir con referencia, importe, moneda, comercio y entorno", () => {
  const pedido = { id: randomUUID(), total_centavos: 48000 };
  const pago = { external_reference: pedido.id, transaction_amount: 480, currency_id: "MXN", collector_id: 123, live_mode: false, date_last_updated: ahora.toISOString() };
  assert.doesNotThrow(() => validarPagoMP(pago, pedido, "123", false));
  for (const cambio of [{ external_reference: randomUUID() }, { transaction_amount: 1 }, { currency_id: "USD" }, { collector_id: 456 }, { date_last_updated: "mal" }]) assert.throws(() => validarPagoMP({ ...pago, ...cambio }, pedido, "123", false));
  // En pruebas se acepta cualquier live_mode; en producción el pago debe ser real.
  assert.doesNotThrow(() => validarPagoMP({ ...pago, live_mode: true }, pedido, "123", false));
  assert.doesNotThrow(() => validarPagoMP({ ...pago, live_mode: true }, pedido, "123", true));
  assert.throws(() => validarPagoMP(pago, pedido, "123", true));
});
test("el cobro permanece cerrado sin activación y configuración completas", () => {
  const anterior = process.env.MERCADOPAGO_ENABLED;
  process.env.MERCADOPAGO_ENABLED = "false";
  assert.throws(configuracionPago, /no está habilitado/);
  if (anterior === undefined) delete process.env.MERCADOPAGO_ENABLED; else process.env.MERCADOPAGO_ENABLED = anterior;
});
