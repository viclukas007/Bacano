/* eslint-disable @typescript-eslint/no-require-imports */
require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { suscribir } = require("../src/app/acciones.ts");

const formulario = (correo) => { const fd = new FormData(); fd.set("correo", correo); return fd; };
async function alta(correo) {
  const log = console.log; console.log = () => {};
  try { return await suscribir(null, formulario(correo)); } finally { console.log = log; }
}

test("acepta correos normales y rechaza los incompletos", async () => {
  for (const ok of ["hola@correo.com", "a.b+tag@sub.dominio.com.mx", "x@y.co"]) assert.equal((await alta(ok)).ok, true, ok);
  for (const mal of ["", "sin-arroba", "a@b", "a@b.c", "a@@b.com", "a b@c.com", "a@.com", "a@b..com"]) assert.equal((await alta(mal)).ok, false, mal);
});
test("un correo de 1 MB se rechaza en milisegundos: el tope va antes del regex y el patrón es lineal", async () => {
  const inicio = process.hrtime.bigint();
  const r = await alta("a@" + ".".repeat(1_000_000) + "@");
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
  assert.equal(r.ok, false);
  assert.ok(ms < 50, `tardó ${ms.toFixed(1)} ms`);
});
