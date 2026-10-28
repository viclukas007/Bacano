/* eslint-disable @typescript-eslint/no-require-imports -- Arnés para ejecutar los módulos TypeScript reales. */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (mod, ruta) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(ruta, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  mod._compile(outputText, ruta);
};
const resolver = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolver.call(this, request.startsWith("@/") ? path.resolve(__dirname, "../src", request.slice(2)) : request, ...args);
};
