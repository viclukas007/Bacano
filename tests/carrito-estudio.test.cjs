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
const base = { fecha: "2026-11-02", inicio: "08:00", horas: 1, tecnico: false, transmision: false, operadoresExtra: 0, ediciones: 0, paquetesClips: 0 };
const opciones = { hoy: "2026-10-25", ultimaFecha: "2026-12-27", ahora: "2026-10-25 12:00", reservas: [], carrito: [] };

test("la cotización recibida suma 3,480 MXN", () => {
  const sesion = { ...base, tecnico: true, transmision: true, operadoresExtra: 1, ediciones: 1, paquetesClips: 1 };
  assert.equal(totalSesion(sesion), 3480);
  assert.equal(conceptosSesion(sesion).length, 6);
});
test("las horas multiplican estudio y personal; edición y clips conservan precio por unidad", () => {
  assert.equal(totalSesion({ ...base, horas: 2, tecnico: true, transmision: true, operadoresExtra: 1, ediciones: 1, paquetesClips: 1 }), 4460);
});
test("dos operadores durante tres horas cuestan 900 y dos paquetes incluyen 20 clips", () => {
  const filas = conceptosSesion({ ...base, horas: 3, operadoresExtra: 2, paquetesClips: 2 });
  assert.equal(filas.find((c) => c.nombre === "Operador extra").subtotal, 900);
  assert.equal(filas.find((c) => c.nombre === "Paquete de 10 clips").subtotal, 2000);
});
test("el estudio solo cuesta 480 por hora y multicámara no agrega cargos", () => {
  assert.equal(totalSesion(base), 480);
  assert.equal(conceptosSesion(base).length, 1);
});
test("permite toda la jornada 08:00–21:00 y la última hora 20:00–21:00", () => {
  assert.equal(validarSesion({ ...base, horas: 13 }, opciones), null);
  assert.equal(totalSesion({ ...base, horas: 13 }), 6240);
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
  for (const cambio of [{ ediciones: -1 }, { paquetesClips: 0.5 }, { operadoresExtra: 21 }, { tecnico: "true" }, { transmision: null }]) {
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
test("una sesión guardada que ya pasó se conserva para poder editarla y se marca inválida", () => {
  const [sesion] = leerCarrito(JSON.stringify([{ ...base, id: "vieja", fecha: "2026-10-24" }]));
  assert.equal(sesion.id, "vieja");
  assert.ok(validarSesion(sesion, opciones));
});
