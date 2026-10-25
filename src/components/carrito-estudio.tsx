"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { IconFlecha } from "@/components/icons";
import { diaLargo, sumarDias, type Reserva } from "@/lib/estudio";
import {
  APERTURA, CIERRE, MAX_UNIDADES, TARIFAS, conceptosSesion, finSesion,
  horaEtiqueta, leerCarrito, pesos, totalSesion, validarSesion,
  type ConfiguracionEstudio, type SesionEstudio,
} from "@/lib/carrito-estudio";

const CLAVE = "bacano:carrito-estudio:v1";
const EVENTO = "bacano:carrito-estudio";
const VACIO: SesionEstudio[] = [];
let memoria: SesionEstudio[] = VACIO;
let ultimoTexto: string | null | undefined;
let soloMemoria = false;

function leer() {
  if (soloMemoria) return memoria;
  try {
    const texto = window.localStorage.getItem(CLAVE);
    if (texto !== ultimoTexto) { memoria = leerCarrito(texto); ultimoTexto = texto; }
  } catch { /* El carrito también funciona si el navegador bloquea localStorage. */ }
  return memoria;
}
function guardar(sesiones: SesionEstudio[]) {
  memoria = sesiones;
  try { ultimoTexto = JSON.stringify(sesiones); window.localStorage.setItem(CLAVE, ultimoTexto); soloMemoria = false; } catch { soloMemoria = true; }
  window.dispatchEvent(new Event(EVENTO));
}
function suscribir(cambio: () => void) {
  const alCambiar = (e: StorageEvent) => { if (e.key === CLAVE || e.key === null) cambio(); };
  window.addEventListener(EVENTO, cambio);
  window.addEventListener("storage", alCambiar);
  return () => { window.removeEventListener(EVENTO, cambio); window.removeEventListener("storage", alCambiar); };
}
const snapshotServidor = () => VACIO;
const CAMPO = "mt-2 min-h-12 w-full min-w-0 border-2 border-borde bg-tinta px-3 py-2.5 text-base text-white [color-scheme:dark] focus:border-cian";
const SECUNDARIO = "min-h-11 border border-borde px-3 py-2 text-sm text-gris transition-colors hover:border-cian hover:text-cian";
const PRIMARIO = "display flex min-h-12 w-full items-center justify-center gap-3 bg-cian px-5 py-4 text-[17px] tracking-[0.04em] text-tinta transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-borde disabled:text-gris";

function ahoraMerida() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Merida", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${parte("year")}-${parte("month")}-${parte("day")} ${parte("hour")}:${parte("minute")}`;
}

function Cantidad({ id, nombre, valor, cambiar, unidad }: {
  id: string; nombre: string; valor: number; cambiar: (valor: number) => void; unidad: string;
}) {
  return (
    <div className="flex shrink-0 items-center border border-borde bg-tinta">
      <button type="button" aria-label={`Quitar ${unidad}`} disabled={valor === 0} onClick={() => cambiar(valor - 1)} className="size-11 text-xl text-cian disabled:text-gris-tenue">−</button>
      <input id={id} aria-label={nombre} type="number" min={0} max={MAX_UNIDADES} step={1} value={valor}
        onChange={(e) => cambiar(Math.min(MAX_UNIDADES, Math.max(0, Math.trunc(Number(e.target.value)) || 0)))}
        className="h-11 w-11 bg-transparent text-center text-base text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <button type="button" aria-label={`Agregar ${unidad}`} disabled={valor === MAX_UNIDADES} onClick={() => cambiar(valor + 1)} className="size-11 text-xl text-cian disabled:text-gris-tenue">+</button>
    </div>
  );
}

export function CarritoEstudio({ hoy, ahora, lunes, ultimaFecha, reservas }: {
  hoy: string; ahora: string; lunes: string; ultimaFecha: string; reservas: Reserva[];
}) {
  const carrito = useSyncExternalStore(suscribir, leer, snapshotServidor);
  const siguienteHora = Math.max(APERTURA, Number(ahora.slice(11, 13)) + 1);
  const [sesion, setSesion] = useState<ConfiguracionEstudio>({
    fecha: siguienteHora >= CIERRE ? sumarDias(hoy, 1) : hoy,
    inicio: horaEtiqueta(siguienteHora >= CIERRE ? APERTURA : siguienteHora), horas: 1,
    tecnico: false, transmision: false, operadoresExtra: 0, ediciones: 0, paquetesClips: 0,
  });
  const [editando, setEditando] = useState<string | null>(null);
  const [paso, setPaso] = useState<"sesiones" | "datos" | "pago">("sesiones");
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [contacto, setContacto] = useState({ nombre: "", correo: "", telefono: "", notas: "" });
  const titulo = useRef<HTMLHeadingElement>(null);
  const nombre = useRef<HTMLInputElement>(null);
  const total = carrito.reduce((suma, s) => suma + totalSesion(s), 0);
  const conceptos = conceptosSesion(sesion);
  const opciones = { hoy, ultimaFecha, ahora, reservas, carrito, omitirId: editando ?? undefined };
  const problema = validarSesion(sesion, opciones);
  const problemasCarrito = carrito.map((s) => validarSesion(s, { ...opciones, omitirId: s.id }));
  const hayProblemas = problemasCarrito.some(Boolean);
  const semanaVisible = sesion.fecha >= lunes && sesion.fecha <= sumarDias(lunes, 6);

  function cambiar(cambio: Partial<ConfiguracionEstudio>) { setSesion((s) => ({ ...s, ...cambio })); setError(""); setAviso(""); }
  function irA(nuevoPaso: typeof paso) {
    setPaso(nuevoPaso); setError(""); setAviso("");
    requestAnimationFrame(() => { titulo.current?.scrollIntoView({ block: "start", behavior: "smooth" }); titulo.current?.focus(); });
  }
  function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editando && !carrito.some((s) => s.id === editando)) { setError("La sesión ya no está en el carrito. Cancela la edición y agrégala de nuevo."); return; }
    const fallo = validarSesion(sesion, { ...opciones, ahora: ahoraMerida() });
    if (fallo) { setError(fallo); return; }
    if (!editando && carrito.length >= 50) { setError("Puedes agregar hasta 50 sesiones al carrito."); return; }
    const nueva = { ...sesion, id: editando ?? globalThis.crypto?.randomUUID?.() ?? Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join("-") };
    guardar(editando ? carrito.map((s) => s.id === editando ? nueva : s) : [...carrito, nueva]);
    setEditando(null); setError(""); setAviso(editando ? "Sesión actualizada en tu carrito." : "Sesión agregada. Puedes elegir otra fecha o continuar con tus datos.");
  }
  function editar(s: SesionEstudio) { setSesion({ ...s }); setEditando(s.id); irA("sesiones"); }
  function revisarCarrito() {
    const fallo = carrito.map((s) => validarSesion(s, { ...opciones, ahora: ahoraMerida(), omitirId: s.id })).find(Boolean);
    if (!carrito.length || fallo) { setError(fallo ?? "Agrega una sesión al carrito."); return false; }
    return true;
  }
  function continuar() {
    if (editando) { setError("Guarda los cambios de la sesión antes de continuar."); titulo.current?.focus(); return; }
    if (revisarCarrito()) { irA("datos"); requestAnimationFrame(() => nombre.current?.focus()); }
  }

  return (
    <div className="mb-12">
      <ol aria-label="Pasos de la reserva" className="mb-6 flex flex-wrap gap-x-6 gap-y-3 border-y border-borde py-4 text-sm sm:gap-x-9">
        {[["sesiones", "Arma tu sesión"], ["datos", "Tus datos"], ["pago", "Pago"]].map(([id, texto], i) => (
          <li key={id} aria-current={paso === id ? "step" : undefined} className={`flex items-center gap-2.5 ${paso === id ? "text-cian" : "text-gris"}`}>
            <span className={`flex size-6 items-center justify-center border text-xs ${paso === id ? "border-cian bg-cian text-tinta" : "border-borde"}`}>{i + 1}</span>{texto}
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 border-2 border-borde bg-humo p-5 sm:p-7">
          <h3 ref={titulo} tabIndex={-1} className="display scroll-mt-28 text-[30px] text-white sm:text-[36px]">
            {paso === "sesiones" ? (editando ? "Edita tu sesión" : "Tu podcast empieza aquí") : paso === "datos" ? "¿Quién viene a grabar?" : "Todo listo para el siguiente paso"}
          </h3>
          {paso === "sesiones" && (
            <form onSubmit={agregar} className="mt-4">
              <p className="mb-6 text-sm leading-relaxed text-gris">Elige cuándo grabar y suma lo que necesitas. Todos los precios están en MXN.</p>
              <fieldset>
                <legend className="display mb-4 text-lg tracking-[0.06em] text-cian">01 / Fecha y horario</legend>
                <div className="grid gap-4 sm:grid-cols-[1.35fr_1fr_1fr]">
                  <label className="min-w-0 text-sm text-gris">Fecha
                    <input aria-label="Fecha de la sesión" required type="date" min={hoy} max={ultimaFecha} value={sesion.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} className={CAMPO} />
                  </label>
                  <label className="text-sm text-gris">Hora de inicio
                    <select value={sesion.inicio} onChange={(e) => { const inicio = e.target.value; cambiar({ inicio, horas: Math.min(sesion.horas, CIERRE - Number(inicio.slice(0, 2))) }); }} className={CAMPO}>
                      {Array.from({ length: CIERRE - APERTURA }, (_, i) => APERTURA + i).map((h) => <option key={h} value={horaEtiqueta(h)} disabled={sesion.fecha === hoy && `${hoy} ${horaEtiqueta(h)}` <= ahora}>{horaEtiqueta(h)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-gris">Duración
                    <select value={sesion.horas} onChange={(e) => cambiar({ horas: Number(e.target.value) })} className={CAMPO}>
                      {Array.from({ length: CIERRE - Number(sesion.inicio.slice(0, 2)) }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h} {h === 1 ? "hora" : "horas"}</option>)}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-sm text-gris">08:00–21:00 · Hora de Mérida · Terminas a las <span className="text-white">{finSesion(sesion)}</span></p>
                <p className="mt-2 text-xs leading-relaxed text-gris">{semanaVisible ? "Consulta la ocupación en el calendario de abajo." : "Esta fecha está fuera de la semana mostrada. Cambia la semana del calendario para consultar su ocupación."} <a href="#disponibilidad-estudio" className="text-cian underline underline-offset-4">Ver calendario</a></p>
              </fieldset>

              <div className="my-6 flex flex-wrap items-center justify-between gap-4 border-l-4 border-cian bg-cian/5 p-4">
                <div><p className="font-bold text-white">Renta del estudio</p><p className="mt-1 text-sm text-gris">Video multicámara incluido</p></div>
                <p className="text-right"><span className="display text-2xl text-cian">{pesos(TARIFAS.estudio)}</span><span className="ml-1 text-sm text-gris">/ hora</span></p>
              </div>

              <fieldset>
                <legend className="display mb-2 text-lg tracking-[0.06em] text-cian">02 / Hazlo a tu medida</legend>
                <p className="mb-3 text-sm text-gris">Servicios opcionales para tu grabación.</p>
                <div className="divide-y divide-borde">
                  {([
                    ["tecnico", "Técnico/operador", "Una persona a cargo de tu grabación.", TARIFAS.tecnico],
                    ["transmision", "Transmisión en vivo", "Lleva tu episodio al aire mientras grabas.", TARIFAS.transmision],
                  ] as const).map(([clave, etiqueta, descripcion, precio]) => (
                    <label key={clave} className="flex cursor-pointer items-start gap-3 py-4">
                      <input type="checkbox" checked={sesion[clave]} onChange={(e) => cambiar({ [clave]: e.target.checked })} className="mt-1 size-5 shrink-0 accent-cian" />
                      <span className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-4 gap-y-1">
                        <span><span className="block font-medium text-white">{etiqueta}</span><span className="mt-1 block text-xs leading-relaxed text-gris">{descripcion}</span></span>
                        <span className="shrink-0 text-sm text-white">{pesos(precio)} <span className="text-gris">/ hora</span></span>
                      </span>
                    </label>
                  ))}
                  {([
                    ["operadoresExtra", "Operador extra", "Por operador y por cada hora de estudio.", TARIFAS.operadorExtra, "operador extra", "/ hora"],
                    ["ediciones", "Edición de episodio", "Un episodio de 40 a 60 minutos por unidad.", TARIFAS.edicion, "edición", "/ episodio"],
                    ["paquetesClips", "Paquete de 10 clips", "10 clips por paquete. Se cobra por paquete.", TARIFAS.clips, "paquete de clips", "/ paquete"],
                  ] as const).map(([clave, etiqueta, descripcion, precio, unidad, tarifa]) => (
                    <div key={clave} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <label htmlFor={`servicio-${clave}`} className="min-w-0 flex-1 basis-48"><span className="block font-medium text-white">{etiqueta}</span><span className="mt-1 block text-xs leading-relaxed text-gris">{descripcion}</span><span className="mt-2 block text-sm text-white">{pesos(precio)} <span className="text-gris">{tarifa}</span></span></label>
                      <Cantidad id={`servicio-${clave}`} nombre={`Cantidad de ${etiqueta.toLowerCase()}`} valor={sesion[clave]} unidad={unidad} cambiar={(valor) => cambiar({ [clave]: valor })} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 border-t-2 border-borde pt-5">
                <p className="mb-3 text-sm text-gris">Desglose de esta sesión</p>
                <ul className="space-y-2 text-sm">{conceptos.map((c) => <li key={c.nombre} className="flex justify-between gap-4"><span className="text-gris">{c.nombre} <span className="text-xs">({c.cantidad} {c.unidad})</span></span><span className="shrink-0 text-white">{pesos(c.subtotal)}</span></li>)}</ul>
                <div className="my-5 flex items-end justify-between gap-3"><p className="text-sm text-gris">Total de esta sesión</p><p className="display text-3xl text-white">{pesos(totalSesion(sesion))} <span className="text-sm text-gris">MXN</span></p></div>
                {problema && <p className="mb-4 border-l-2 border-vivo bg-vivo/5 p-3 text-sm text-white">{problema}</p>}
                <button type="submit" disabled={Boolean(problema)} className={PRIMARIO}>{editando ? "Guardar cambios" : "Agregar al carrito"}<IconFlecha size={20} /></button>
                {editando && <button type="button" className={`${SECUNDARIO} mt-3 w-full`} onClick={() => { setEditando(null); setError(""); }}>Cancelar edición</button>}
              </div>
            </form>
          )}

          {paso === "datos" && (
            <form className="mt-5" onSubmit={(e) => { e.preventDefault(); if (revisarCarrito()) irA("pago"); }}>
              <p className="mb-6 text-sm leading-relaxed text-gris">Deja tus datos para revisar tu reserva antes de pasar al pago.</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm text-gris sm:col-span-2">Nombre completo<input ref={nombre} required name="nombre" autoComplete="name" maxLength={120} value={contacto.nombre} onChange={(e) => setContacto({ ...contacto, nombre: e.target.value })} className={CAMPO} /></label>
                <label className="min-w-0 text-sm text-gris">Correo electrónico<input required type="email" name="correo" autoComplete="email" maxLength={180} value={contacto.correo} onChange={(e) => setContacto({ ...contacto, correo: e.target.value })} className={CAMPO} /></label>
                <label className="min-w-0 text-sm text-gris">Teléfono / WhatsApp<input required type="tel" name="telefono" autoComplete="tel" minLength={7} maxLength={25} value={contacto.telefono} onChange={(e) => setContacto({ ...contacto, telefono: e.target.value })} className={CAMPO} /></label>
                <label className="text-sm text-gris sm:col-span-2">Cuéntanos sobre tu podcast <span className="text-xs">(opcional)</span><textarea name="notas" rows={3} maxLength={1000} value={contacto.notas} onChange={(e) => setContacto({ ...contacto, notas: e.target.value })} className={CAMPO} /></label>
              </div>
              <p className="my-5 text-xs leading-relaxed text-gris">Agregar sesiones al carrito no aparta los horarios. La disponibilidad deberá confirmarse al reservar.</p>
              <button className={PRIMARIO} type="submit">Revisar antes de pagar<IconFlecha size={20} /></button>
              <button className={`${SECUNDARIO} mt-3 w-full`} type="button" onClick={() => irA("sesiones")}>Volver a mis sesiones</button>
            </form>
          )}

          {paso === "pago" && (
            <div className="mt-5">
              <p className="text-sm leading-relaxed text-gris">Revisa tus datos y el resumen de tu carrito.</p>
              <dl className="my-6 grid gap-4 border-y border-borde py-5 text-sm sm:grid-cols-2">
                <div><dt className="text-gris">Nombre</dt><dd className="mt-1 break-words text-white">{contacto.nombre}</dd></div>
                <div><dt className="text-gris">Teléfono</dt><dd className="mt-1 break-words text-white">{contacto.telefono}</dd></div>
                <div className="sm:col-span-2"><dt className="text-gris">Correo</dt><dd className="mt-1 break-words text-white">{contacto.correo}</dd></div>
                {contacto.notas && <div className="sm:col-span-2"><dt className="text-gris">Sobre tu podcast</dt><dd className="mt-1 whitespace-pre-wrap break-words text-white">{contacto.notas}</dd></div>}
              </dl>
              <div className="border-2 border-cian/40 bg-cian/5 p-5 sm:p-6">
                <span className="mb-3 inline-block border border-cian/40 px-2 py-1 text-[11px] uppercase tracking-widest text-cian">Próximamente</span>
                <h4 className="display text-2xl text-white">Pago con Mercado Pago</h4>
                <p className="my-4 text-sm leading-relaxed text-gris">Estamos preparando el pago en línea. Por ahora puedes armar tu carrito y revisar el total; los horarios todavía no están apartados.</p>
                <button type="button" disabled aria-describedby="pago-estudio-pendiente" className={PRIMARIO}>Pagar {pesos(total)} con Mercado Pago</button>
                <p id="pago-estudio-pendiente" className="mt-3 text-xs text-gris">El pago en línea aún no está habilitado.</p>
              </div>
              <button type="button" className={`${SECUNDARIO} mt-4 w-full`} onClick={() => irA("datos")}>Corregir mis datos</button>
              <button type="button" className={`${SECUNDARIO} mt-3 w-full`} onClick={() => irA("sesiones")}>Volver a mis sesiones</button>
            </div>
          )}
          <p role="alert" className={error ? "mt-4 border-l-2 border-vivo bg-vivo/5 p-3 text-sm text-white" : ""}>{error}</p>
          <p role="status" className={aviso ? "mt-4 text-sm leading-relaxed text-cian" : ""}>{aviso}</p>
        </div>

        <aside aria-label="Carrito de estudio" className="min-w-0 border-2 border-cian bg-carbon xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3 border-b border-borde p-5"><h3 className="display text-[28px] text-white">Tu carrito</h3><span className="flex size-8 items-center justify-center bg-cian text-sm font-bold text-tinta" aria-label={`${carrito.length} sesiones`}>{carrito.length}</span></div>
          {!carrito.length ? (
            <div className="px-5 py-10"><p className="display mb-3 text-2xl text-white">Haz espacio para tu voz.</p><p className="text-sm leading-relaxed text-gris">Elige tus horas y servicios y agrega tu primera sesión.</p><p className="mt-5 text-sm text-cian">Desde {pesos(TARIFAS.estudio)} MXN / hora</p></div>
          ) : (
            <ul className="max-h-[65vh] divide-y divide-borde overflow-y-auto">
              {carrito.map((s, i) => (
                <li key={s.id} className="p-5">
                  <div className="mb-1 flex items-start justify-between gap-3"><p className="display text-xl text-white">Sesión {i + 1}</p><span className="text-sm font-bold text-cian">{pesos(totalSesion(s))}</span></div>
                  <p className="text-sm capitalize text-white">{diaLargo(s.fecha)} {s.fecha.slice(0, 4)}</p>
                  <p className="mt-1 text-xs text-gris">{s.inicio}–{finSesion(s)} · {s.horas} {s.horas === 1 ? "hora" : "horas"} · Mérida</p>
                  <ul className="my-3 space-y-1.5 text-xs text-gris">{conceptosSesion(s).map((c) => <li key={c.nombre} className="flex justify-between gap-3"><span>{c.nombre} · {c.cantidad} {c.unidad}</span><span className="shrink-0">{pesos(c.subtotal)}</span></li>)}</ul>
                  <p className="text-xs text-cian">Video multicámara incluido</p>
                  {problemasCarrito[i] && <p className="mt-3 border-l-2 border-vivo pl-2 text-xs text-white">{problemasCarrito[i]}</p>}
                  <div className="mt-4 flex gap-2"><button type="button" aria-label={`Editar sesión ${i + 1}`} className={SECUNDARIO} onClick={() => editar(s)}>Editar</button><button type="button" aria-label={`Eliminar sesión ${i + 1}`} className={SECUNDARIO} onClick={() => { guardar(carrito.filter((r) => r.id !== s.id)); if (editando === s.id) setEditando(null); irA("sesiones"); setAviso("Sesión eliminada del carrito."); }}>Eliminar</button></div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t-2 border-borde p-5">
            <div aria-live="polite" aria-atomic="true" className="mb-5 flex flex-wrap items-end justify-between gap-2"><p className="text-sm text-gris">Total del carrito</p><p className="display text-[34px] text-white">{pesos(total)} <span className="text-sm text-gris">MXN</span></p></div>
            {paso === "sesiones" && <button type="button" disabled={!carrito.length || hayProblemas} onClick={continuar} className={PRIMARIO}>Continuar con mis datos<IconFlecha size={20} /></button>}
            <p className="mt-4 text-xs leading-relaxed text-gris">Tu carrito se conserva en este navegador. Los horarios se confirman al reservar.</p>
            <p className="mt-3 border-t border-borde pt-3 text-xs text-gris">Pasarela de pago: <span className="text-white">Mercado Pago</span></p>
          </div>
        </aside>
      </div>
    </div>
  );
}
