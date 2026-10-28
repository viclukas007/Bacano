/* eslint-disable @typescript-eslint/no-require-imports -- El arnés CommonJS transpila los módulos TypeScript reales en memoria. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
// Ejecuta los módulos reales de TypeScript sin generar archivos ni añadir dependencias.
require.extensions[".ts"] = (modulo, ruta) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(ruta, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  modulo._compile(outputText, ruta);
};
const { conceptosSesion, totalSesion, validarSesion, leerCarrito } = require("../src/lib/carrito-estudio.ts");
const base = { fecha: "2026-11-02", inicio: "08:00", horas: 1, transmision: false, ediciones: 0, paquetesReels: 0 };
const opciones = { hoy: "2026-10-25", ultimaFecha: "2026-12-27", ahora: "2026-10-25 12:00", reservas: [], carrito: [] };

test("una hora con transmisión, una edición y un paquete de reels suma 5,300 MXN", () => {
  const sesion = { ...base, transmision: true, ediciones: 1, paquetesReels: 1 };
  assert.equal(totalSesion(sesion), 5300);
  assert.equal(conceptosSesion(sesion).length, 4);
});
test("cada hora después de la primera cuesta 700 y la transmisión se cobra una vez por sesión", () => {
  const filas = conceptosSesion({ ...base, horas: 3, transmision: true });
  assert.equal(filas.find((c) => c.nombre === "Hora extra de estudio").subtotal, 1400);
  assert.equal(filas.find((c) => c.nombre === "Transmisión en vivo").subtotal, 200);
  assert.equal(totalSesion({ ...base, horas: 3, transmision: true }), 2700);
});
test("edición y reels se cobran por unidad, sin importar las horas", () => {
  const filas = conceptosSesion({ ...base, horas: 3, ediciones: 2, paquetesReels: 2 });
  assert.equal(filas.find((c) => c.nombre === "Edición de programa").subtotal, 6000);
  assert.equal(filas.find((c) => c.nombre === "Paquete de 4 reels").subtotal, 2000);
});
test("una hora de estudio cuesta 1,100 y multicámara no agrega cargos", () => {
  assert.equal(totalSesion(base), 1100);
  assert.equal(conceptosSesion(base).length, 1);
});
test("permite toda la jornada 08:00–21:00 y la última hora 20:00–21:00", () => {
  assert.equal(validarSesion({ ...base, horas: 13 }, opciones), null);
  assert.equal(totalSesion({ ...base, horas: 13 }), 9500);
  assert.equal(validarSesion({ ...base, inicio: "20:00" }, opciones), null);
});
test("rechaza antes de abrir, al cierre, después de cerrar, medias horas y duración cero", () => {
  for (const cambio of [{ inicio: "07:00" }, { inicio: "21:00" }, { inicio: "20:00", horas: 2 }, { inicio: "08:30" }, { horas: 0 }, { horas: 1.5 }]) {
    assert.ok(validarSesion({ ...base, ...cambio }, opciones), JSON.stringify(cambio));
  }
});
test("rechaza días inexistentes, pasados, fuera del periodo y horas ya pasadas de hoy", () => {
  for (const cambio of [{ fecha: "2026-02-30" }, { fecha: "2026-10-24" }, { fecha: "2027-01-01" }, { fecha: "2026-10-25", inicio: "12:00" }]) {
    assert.ok(validarSesion({ ...base, ...cambio }, opciones));
  }
});
test("rechaza cantidades inválidas y servicios de tipo incorrecto", () => {
  for (const cambio of [{ ediciones: -1 }, { paquetesReels: 0.5 }, { ediciones: 21 }, { paquetesReels: undefined }, { transmision: null }, { transmision: "true" }]) {
    assert.ok(validarSesion({ ...base, ...cambio }, opciones));
  }
});
test("detecta ocupación, incluyendo una reserva que empezó el día anterior", () => {
  const reservas = [{ id: 1, quien: "Ocupado", tipo: "renta", desde: "2026-11-01 23:00", hasta: "2026-11-02 09:00" }];
  assert.match(validarSesion(base, { ...opciones, reservas }), /ocupado/);
  assert.equal(validarSesion({ ...base, inicio: "09:00" }, { ...opciones, reservas }), null);
});
test("permite sesiones adyacentes y evita cruces en el carrito", () => {
  const carrito = [{ ...base, id: "sesion-1", horas: 2 }];
  assert.match(validarSesion({ ...base, inicio: "09:00" }, { ...opciones, carrito }), /cruza/);
  assert.equal(validarSesion({ ...base, inicio: "10:00" }, { ...opciones, carrito }), null);
  assert.equal(validarSesion(base, { ...opciones, carrito, omitirId: "sesion-1" }), null);
});
test("recupera sesiones locales y elimina entradas inválidas o IDs duplicados", () => {
  const sesion = { ...base, id: "sesion-1" };
  assert.deepEqual(leerCarrito(JSON.stringify([sesion, sesion, { id: "mala" }, { ...sesion, id: "fuera", inicio: "22:00" }])), [sesion]);
  assert.deepEqual(leerCarrito("{error"), []);
  assert.deepEqual(leerCarrito("null"), []);
  assert.deepEqual(leerCarrito(null), []);
});
test("al leer el carrito se descartan las sesiones que ya empezaron y se conservan las futuras", () => {
  const futura = { ...base, id: "futura" };
  const guardado = JSON.stringify([{ ...base, id: "vieja", fecha: "2026-10-24", transmision: true }, { ...base, id: "hoy", fecha: "2026-10-25", inicio: "12:00" }, futura]);
  assert.deepEqual(leerCarrito(guardado, opciones.ahora), [futura]);
  assert.equal(leerCarrito(guardado).length, 3);
});
