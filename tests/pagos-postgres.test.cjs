/* eslint-disable @typescript-eslint/no-require-imports -- Integración con PostgreSQL real y frontera HTTP de MP simulada. */
require("./register.cjs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHmac } = require("node:crypto");
const Module = require("node:module");
const postgres = require("postgres");
const { NextRequest } = require("next/server");
const { validarPedido, fechaHoraMerida } = require("../src/lib/pagos-estudio-reglas.ts");
const { sumarDias } = require("../src/lib/estudio.ts");

// Solo se sustituye la invalidación de la caché de Next fuera de su servidor.
const cargar = Module._load;
Module._load = function (id, ...args) {
  if (id === "next/cache") return { revalidateTag() {}, unstable_cache: fn => fn };
  if (id === "@/lib/auth") return { exigirSesion: async () => {} };
  return cargar.call(this, id, ...args);
};
const originalUrl = process.env.DATABASE_URL;
if (!originalUrl || process.env.PAGOS_TEST_ISOLATED !== "true") throw new Error("Ejecutar únicamente mediante el servicio pruebas de Docker Compose.");
const nombreDb = `bacano_pagos_test_${randomBytes(8).toString("hex")}`;
const control = postgres(originalUrl, { max: 1, onnotice() {} });
const originalFetch = global.fetch;
const pagosRemotos = new Map();
let preferencias = 0;
let falloPreferencia = false;
let db, servicio, checkout, webhook, estadoRoute, admin;
const config = { token: "token-falso-solo-tests", secreto: "secreto-falso-tests", vendedor: "123", appUrl: "https://bacano.example", produccion: false, minutos: 15 };
const contacto = { nombre: "Cliente prueba", correo: "cliente@example.com", telefono: "+52 999 123 4567", notas: "Integración" };
let fecha;
function sesion(inicio = "08:00", cambio = {}) { return { fecha, inicio, horas: 1, transmision: false, ediciones: 0, paquetesReels: 0, ...cambio }; }
function datos(sesiones) { return validarPedido({ contacto, sesiones }); }
function pago(pedido, cambio = {}) {
  return { id: String(Math.floor(Math.random() * 1e12)), status: "approved", status_detail: "accredited", external_reference: pedido.id, transaction_amount: pedido.total_centavos / 100, currency_id: "MXN", collector_id: 123, live_mode: false, date_approved: new Date().toISOString(), date_last_updated: new Date().toISOString(), ...cambio };
}
async function crear(sesiones, propietario = randomBytes(32).toString("hex"), clave = randomUUID()) {
  return servicio.crearPedido(datos(sesiones), propietario, clave, 15);
}
async function enviarWebhook(p, cambio = {}) {
  pagosRemotos.set(String(p.id), p);
  const ts = String(Date.now());
  const firma = createHmac("sha256", config.secreto).update(`id:${p.id};request-id:test-req;ts:${ts};`).digest("hex");
  return webhook.POST(new NextRequest(`${config.appUrl}/api/mercadopago/webhook?data.id=${p.id}`, { method: "POST", headers: { "Content-Type": "application/json", "x-request-id": "test-req", "x-signature": `ts=${ts},v1=${firma}`, ...cambio }, body: JSON.stringify({ type: "payment", data: { id: p.id } }) }));
}
before(async () => {
  // Se crea una BD efímera; nunca se ejecutan pruebas sobre las tablas del sitio.
  await control.unsafe(`CREATE DATABASE "${nombreDb}"`);
  const url = new URL(originalUrl); url.pathname = `/${nombreDb}`;
  process.env.DATABASE_URL = url.toString();
  // Reproduce la tabla previa a la integración y conserva una reserva de control.
  const legado = postgres(url.toString(), { max: 1, onnotice() {} });
  await legado.unsafe(`CREATE TABLE reservas (
    id serial PRIMARY KEY, quien text NOT NULL, tipo text NOT NULL DEFAULT 'renta',
    desde timestamp NOT NULL, hasta timestamp NOT NULL, notas text,
    creado_en timestamptz NOT NULL DEFAULT now(), actualizado_en timestamptz NOT NULL DEFAULT now(),
    CHECK (hasta > desde), EXCLUDE USING gist (tsrange(desde,hasta) WITH &&)
  ); INSERT INTO reservas (quien,desde,hasta,notas) VALUES ('Reserva previa','2001-01-01 08:00','2001-01-01 09:00','Conservar');`);
  await legado.end();
  Object.assign(process.env, { NODE_ENV: "test", MERCADOPAGO_ENABLED: "true", MERCADOPAGO_ENV: "test", MERCADOPAGO_ACCESS_TOKEN: config.token, MERCADOPAGO_WEBHOOK_SECRET: config.secreto, MERCADOPAGO_COLLECTOR_ID: config.vendedor, APP_URL: config.appUrl });
  db = require("../src/lib/db.ts");
  servicio = require("../src/lib/pagos-estudio.ts");
  checkout = require("../src/app/api/estudio/checkout/route.ts");
  webhook = require("../src/app/api/mercadopago/webhook/route.ts");
  estadoRoute = require("../src/app/api/estudio/pedidos/[id]/route.ts");
  admin = require("../src/lib/admin.ts");
  await db.prepararBase();
  const [{ nombre }] = await db.sql`SELECT current_database() AS nombre`;
  assert.equal(nombre, nombreDb);
  fecha = sumarDias(fechaHoraMerida().slice(0,10), 2);
  global.fetch = async (entrada, opciones = {}) => {
    const url = new URL(entrada);
    assert.equal(url.origin, "https://api.mercadopago.com", "Nunca contactar servicios reales desde estas pruebas");
    assert.equal(opciones.headers.Authorization, `Bearer ${config.token}`);
    if (url.pathname === "/checkout/preferences") {
      preferencias++;
      const body = JSON.parse(opciones.body);
      assert.equal(body.items[0].currency_id, "MXN");
      assert.equal(body.items[0].unit_price, 1100);
      assert.match(body.notification_url, /\/api\/mercadopago\/webhook$/);
      assert.equal(body.expires, true);
      if (falloPreferencia) throw new Error("Timeout simulado");
      return Response.json({ id: `pref-${body.external_reference}`, init_point: "https://www.mercadopago.com.mx/checkout/v1/test", sandbox_init_point: "https://sandbox.mercadopago.com.mx/checkout/v1/test" });
    }
    if (url.pathname === "/v1/payments/search") return Response.json({ results: [...pagosRemotos.values()].filter(p => p.external_reference === url.searchParams.get("external_reference")) });
    const p = pagosRemotos.get(url.pathname.split("/").pop());
    return p ? Response.json(p) : Response.json({}, { status: 404 });
  };
});

test("la migración conserva las reservas anteriores y las marca confirmadas", async () => {
  const [r] = await db.sql`SELECT quien, notas, estado, pedido_id FROM reservas WHERE quien = 'Reserva previa'`;
  assert.deepEqual({ ...r }, { quien: "Reserva previa", notas: "Conservar", estado: "confirmada", pedido_id: null });
});
test("checkout cerrado sin configuración o con origen ajeno no crea pedidos", async () => {
  const enviar = origin => checkout.POST(new NextRequest(`${config.appUrl}/api/estudio/checkout`, { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify({ contacto, sesiones: [sesion()], clave: randomUUID() }) }));
  process.env.MERCADOPAGO_ENABLED = "false";
  try { assert.equal((await enviar(config.appUrl)).status, 503); } finally { process.env.MERCADOPAGO_ENABLED = "true"; }
  assert.equal((await enviar("https://otro.example")).status, 403);
  const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM estudio_pedidos`; assert.equal(n, 0);
});
after(async () => {
  global.fetch = originalFetch;
  if (db) await db.sql.end({ timeout: 5 });
  if (!/^bacano_pagos_test_[a-f0-9]{16}$/.test(nombreDb)) throw new Error("Nombre de base temporal inválido");
  await control.unsafe(`DROP DATABASE IF EXISTS "${nombreDb}" WITH (FORCE)`);
  await control.end();
});

test("checkout HTTP crea un solo pedido/preferencia al repetir el intento y congela precios", async () => {
  const clave = randomUUID();
  const body = { contacto, sesiones: [{ ...sesion(), total: 1 }], total: 1, clave };
  const enviar = cookie => checkout.POST(new NextRequest(`${config.appUrl}/api/estudio/checkout`, { method: "POST", headers: { "Content-Type": "application/json", origin: config.appUrl, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
  const a = await enviar(); assert.equal(a.status, 200);
  const resultado = await a.json();
  const propietario = a.cookies.get("bacano_estudio").value;
  const b = await enviar(`bacano_estudio=${propietario}`); assert.equal(b.status, 200);
  assert.deepEqual(await b.json(), resultado); assert.equal(preferencias, 1);
  const recuperado = await servicio.iniciarCheckout(datos([sesion()]), propietario, randomUUID(), config);
  assert.equal(recuperado.pedido, resultado.pedido); assert.equal(preferencias, 1);
  const [pedido] = await db.sql`SELECT * FROM estudio_pedidos WHERE id = ${resultado.pedido}`;
  assert.equal(pedido.total_centavos, 110000);
  const [{ conceptos }] = await db.sql`SELECT conceptos FROM estudio_pedido_sesiones WHERE pedido_id = ${pedido.id}`;
  assert.equal(conceptos[0].precioCentavos, 110000);
  const ajeno = await estadoRoute.GET(new NextRequest(`${config.appUrl}/api/estudio/pedidos/${pedido.id}`), { params: Promise.resolve({ id: pedido.id }) });
  assert.equal(ajeno.status, 404);
  const p = pago(pedido);
  assert.equal((await enviarWebhook(p)).status, 200);
  assert.equal((await enviarWebhook(p)).status, 200);
  const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM reservas WHERE pedido_id = ${pedido.id} AND estado = 'confirmada'`;
  assert.equal(n, 1);
  const estado = await estadoRoute.GET(new NextRequest(`${config.appUrl}/api/estudio/pedidos/${pedido.id}`, { headers: { cookie: `bacano_estudio=${propietario}` } }), { params: Promise.resolve({ id: pedido.id }) });
  assert.equal((await estado.json()).estado, "aprobado");
});
test("dos clientes del mismo horario: solo uno obtiene apartado; el pedido perdedor se revierte", async () => {
  const resultados = await Promise.allSettled([crear([sesion("09:00")]), crear([sesion("09:00")])]);
  assert.equal(resultados.filter(r => r.status === "fulfilled").length, 1);
  const rechazado = resultados.find(r => r.status === "rejected"); assert.equal(rechazado.reason.status, 409);
  const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM reservas WHERE desde = ${`${fecha} 09:00`}::timestamp`;
  assert.equal(n, 1);
});
test("si una sesión de un pedido choca se revierte todo el carrito", async () => {
  await assert.rejects(() => crear([sesion("10:00"), sesion("09:00")]), /ocupar/);
  const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM reservas WHERE desde = ${`${fecha} 10:00`}::timestamp`;
  assert.equal(n, 0);
});
test("una reserva manual también impide el apartado", async () => {
  await db.sql`INSERT INTO reservas (quien, tipo, desde, hasta) VALUES ('Manual', 'propio', ${`${fecha} 10:00`}, ${`${fecha} 11:00`})`;
  await assert.rejects(() => crear([sesion("10:00")]), /ocupar/);
});
test("vencimiento libera el horario; pago tardío queda en revisión sin quitar el nuevo apartado", async () => {
  const viejo = await crear([sesion("11:00")]);
  await db.sql`UPDATE estudio_pedidos SET expira_en = now() - interval '1 second' WHERE id = ${viejo.id}`;
  await db.sql`UPDATE reservas SET expira_en = now() - interval '1 second' WHERE pedido_id = ${viejo.id}`;
  const nuevo = await crear([sesion("11:00")]);
  assert.equal((await enviarWebhook(pago(viejo))).status, 200);
  const [r] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${viejo.id}`; assert.equal(r.estado, "revision");
  const [reserva] = await db.sql`SELECT pedido_id, estado FROM reservas WHERE desde = ${`${fecha} 11:00`}::timestamp`;
  assert.equal(reserva.pedido_id, nuevo.id); assert.equal(reserva.estado, "apartado");
});
test("pendiente, rechazo y posterior aprobación; eventos antiguos no degradan confirmación", async () => {
  const pedido = await crear([sesion("12:00")]);
  const p = pago(pedido, { status: "pending" });
  await enviarWebhook(p);
  let [r] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${pedido.id}`; assert.equal(r.estado, "pendiente");
  await enviarWebhook({ ...p, status: "rejected", date_last_updated: new Date(Date.now()+1000).toISOString() });
  [r] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${pedido.id}`; assert.equal(r.estado, "rechazado");
  await enviarWebhook({ ...p, status: "approved", date_last_updated: new Date(Date.now()+2000).toISOString() });
  await enviarWebhook(p);
  [r] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${pedido.id}`; assert.equal(r.estado, "aprobado");
});
test("firma incorrecta y pagos de importe, comercio, moneda o entorno incorrectos no confirman", async () => {
  const pedido = await crear([sesion("13:00")]);
  const p = pago(pedido);
  assert.equal((await enviarWebhook(p, { "x-signature": "ts=123,v1=mal" })).status, 401);
  for (const cambio of [{ transaction_amount: 1 }, { currency_id: "USD" }, { collector_id: 456 }]) assert.equal((await enviarWebhook(pago(pedido, cambio))).status, 422);
  const [r] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${pedido.id}`; assert.equal(r.estado, "creando");
});
test("un segundo pago aprobado y los reembolsos requieren revisión sin duplicar reservas", async () => {
  const pedido = await crear([sesion("14:00")]);
  const p = pago(pedido);
  await enviarWebhook(p);
  await enviarWebhook(pago(pedido));
  const [r] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${pedido.id}`; assert.equal(r.estado, "revision");
  const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM reservas WHERE pedido_id = ${pedido.id}`; assert.equal(n, 1);
  await enviarWebhook({ ...p, status: "refunded", transaction_amount_refunded: 1100, date_last_updated: new Date(Date.now()+1000).toISOString() });
  const [guardado] = await db.sql`SELECT reembolsado_centavos FROM estudio_pagos WHERE id = ${p.id}`; assert.equal(guardado.reembolsado_centavos, 110000);
});
test("el timeout al crear preferencia conserva el pedido; reintentar no duplica apartados", async () => {
  const propietario = randomBytes(32).toString("hex"); const clave = randomUUID(); const d = datos([sesion("15:00")]);
  falloPreferencia = true;
  await assert.rejects(() => servicio.iniciarCheckout(d, propietario, clave, config), /comunicarnos/);
  falloPreferencia = false;
  const r = await servicio.iniciarCheckout(d, propietario, clave, config);
  const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM reservas WHERE pedido_id = ${r.pedido}`; assert.equal(n, 1);
  await assert.rejects(() => servicio.crearPedido(datos([sesion("16:00")]), propietario, clave, 15), /otro carrito/);
});
test("el administrador respeta apartados y no puede editar ni borrar reservas vinculadas a pagos", async () => {
  const pedido = await crear([sesion("16:00")]);
  await assert.rejects(() => admin.guardarReserva({ quien: "Manual", tipo: "propio", desde: `${fecha} 16:00`, hasta: `${fecha} 17:00` }), error => error.code === "23P01");
  const [reserva] = await db.sql`SELECT id FROM reservas WHERE pedido_id = ${pedido.id}`;
  await assert.rejects(() => admin.eliminarReserva(reserva.id), /vinculada a un pago/);
  await enviarWebhook(pago(pedido));
  await assert.rejects(() => admin.guardarReserva({ quien: "Cambio", tipo: "renta", desde: `${fecha} 18:00`, hasta: `${fecha} 19:00` }, reserva.id), /vinculada a un pago/);
});
test("la conciliación recupera una aprobación cuyo webhook no llegó", async () => {
  const r = await servicio.iniciarCheckout(datos([sesion("17:00")]), randomBytes(32).toString("hex"), randomUUID(), config);
  const [pedido] = await db.sql`SELECT * FROM estudio_pedidos WHERE id = ${r.pedido}`;
  const p = pago(pedido); pagosRemotos.set(String(p.id), p);
  await servicio.conciliarPedido(pedido.id, config);
  const [actual] = await db.sql`SELECT estado FROM estudio_pedidos WHERE id = ${pedido.id}`;
  assert.equal(actual.estado, "aprobado");
});
