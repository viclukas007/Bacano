import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Prueba de humo local: no crea pedidos ni contacta a Mercado Pago.
const origen = "http://127.0.0.1:3001";
async function pedir(ruta, opciones = {}) {
  return fetch(`${origen}${ruta}`, { redirect: "manual", signal: AbortSignal.timeout(25000), ...opciones });
}
const home = await pedir("/");
assert.equal(home.status, 200);
assert.match(await home.text(), /Tu carrito/);
const resultado = await pedir("/estudio/pago?status=approved&payment_id=123");
assert.equal(resultado.status, 200);
assert.match(await resultado.text(), /No encontramos el pedido/);
const checkout = await pedir("/api/estudio/checkout", { method: "POST", headers: { "Content-Type": "application/json", origin: origen }, body: "{}" });
assert.equal(checkout.status, 503, "Esta comprobación requiere que el cobro local siga deshabilitado");
const webhook = await pedir("/api/mercadopago/webhook?data.id=123", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"type":"payment","data":{"id":"123"}}' });
assert.equal(webhook.status, 503);
const pedido = await pedir(`/api/estudio/pedidos/${randomUUID()}`);
assert.equal(pedido.status, 404);
assert.match(pedido.headers.get("cache-control"), /no-store/);
const mantenimiento = await pedir("/api/estudio/mantenimiento", { method: "POST" });
assert.equal(mantenimiento.status, 401);
const admin = await pedir("/admin/pedidos");
assert.ok([302, 307].includes(admin.status));
assert.match(admin.headers.get("location"), /\/admin\/entrar$/);
console.log("HTTP local: home, resultado sin confirmación falsa, checkout/webhook deshabilitados, pedido privado, cron protegido y admin con sesión: OK.");
