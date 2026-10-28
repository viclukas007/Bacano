"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { pesos } from "@/lib/carrito-estudio";

interface Resultado { id: string; estado: string; totalCentavos: number; expiraEn: string; sesiones: { desde: string; hasta: string }[] }
const MENSAJES: Record<string, [string, string]> = {
  creando: ["Estamos preparando tu pago", "Aún no se ha confirmado tu reserva."],
  pendiente: ["Tu pago está pendiente", "Estamos esperando la confirmación de Mercado Pago. La reserva se confirma cuando verificamos el pago dentro del apartado."],
  rechazado: ["El pago no fue aprobado", "Puedes volver a intentar desde el carrito. La reserva todavía no está confirmada."],
  aprobado: ["Tu reserva está confirmada", "Verificamos tu pago y los horarios ya están reservados para ti."],
  expirado: ["El apartado venció", "Los horarios se liberaron. Si ya pagaste, estamos verificándolo; un pago tardío requiere revisión del estudio."],
  revision: ["Estamos revisando tu pago", "Contacta al estudio con el número de pedido. El equipo debe verificar el pago y el estado de tu reserva antes de confirmar cambios."],
};
export function ResultadoPago({ inicial }: { inicial: Resultado | null }) {
  const [pedido, setPedido] = useState(inicial);
  const [aviso, setAviso] = useState("");
  const actualizar = useCallback(async () => {
    if (!inicial) return;
    try {
      const r = await fetch(`/api/estudio/pedidos/${inicial.id}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setPedido(await r.json()); setAviso("");
    } catch { setAviso("No pudimos actualizar el estado. Puedes consultarlo de nuevo en un momento."); }
  }, [inicial]);
  useEffect(() => {
    if (!inicial || ["aprobado", "revision"].includes(pedido?.estado ?? "")) return;
    let intentos = 0;
    const primero = setTimeout(() => void actualizar(), 0);
    const timer = setInterval(() => { if (++intentos > 24) clearInterval(timer); else void actualizar(); }, 5000);
    return () => { clearTimeout(primero); clearInterval(timer); };
  }, [actualizar, inicial, pedido?.estado]);
  const [titulo, descripcion] = pedido ? MENSAJES[pedido.estado] ?? MENSAJES.pendiente : ["No encontramos el pedido", "Abre este enlace en el mismo navegador desde el que iniciaste el pago."];
  return <div className="border-2 border-cian bg-carbon p-6 sm:p-9">
    <p className="display text-lg text-cian">Bacano · Renta de estudio</p>
    <h1 className="display my-5 text-4xl text-white" aria-live="polite">{titulo}</h1>
    <p className="text-gris">{descripcion}</p>
    {pedido && <>
      <p className="mt-6 break-all text-sm text-gris">Pedido: <span className="text-white">{pedido.id}</span></p>
      <p className="my-4 text-2xl text-white">{pesos(pedido.totalCentavos / 100)} MXN</p>
      <ul className="space-y-2 text-gris">{pedido.sesiones.map((s, i) => <li key={i}>{s.desde}–{s.hasta.slice(11)} · Mérida</li>)}</ul>
      <button onClick={() => void actualizar()} className="my-6 min-h-11 border border-cian px-4 py-2 text-cian">Actualizar estado</button>
    </>}
    {aviso && <p role="status" className="mb-5 text-gris">{aviso}</p>}
    <p className="mt-4"><Link href="/#estudio" className="text-cian underline">Volver al estudio</Link></p>
  </div>;
}
