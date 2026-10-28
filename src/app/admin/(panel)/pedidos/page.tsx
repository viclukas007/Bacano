import { exigirSesion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { limpiarApartados } from "@/lib/pagos-estudio";
import { pesos } from "@/lib/carrito-estudio";

export const dynamic = "force-dynamic";
export default async function Pedidos() {
  await exigirSesion();
  await limpiarApartados();
  const pedidos = await sql`SELECT id, nombre, correo, telefono, notas, total_centavos, estado, motivo_revision, preferencia_id, pago_aprobado_id,
    to_char(expira_en AT TIME ZONE 'America/Merida', 'YYYY-MM-DD HH24:MI') AS vence FROM estudio_pedidos ORDER BY creado_en DESC LIMIT 100`;
  const sesiones = pedidos.length ? await sql`SELECT pedido_id, to_char(desde,'YYYY-MM-DD HH24:MI') AS desde, to_char(hasta,'YYYY-MM-DD HH24:MI') AS hasta, conceptos FROM estudio_pedido_sesiones WHERE pedido_id IN ${sql(pedidos.map(p => p.id))} ORDER BY indice` : [];
  const pagos = pedidos.length ? await sql`SELECT pedido_id, id, estado, detalle FROM estudio_pagos WHERE pedido_id IN ${sql(pedidos.map(p => p.id))} ORDER BY actualizado_mp DESC` : [];
  return <>
    <h1 className="display text-4xl text-white">Pedidos del estudio</h1>
    <p className="my-4 text-gris">Últimos 100 pedidos. Los pagos tardíos, duplicados, reembolsos y contracargos requieren revisión. Esta vista no realiza devoluciones ni cambia reservas pagadas.</p>
    {!pedidos.length && <p className="py-8 text-gris">Todavía no hay pedidos.</p>}
    <div className="space-y-6">{pedidos.map(p => <article key={p.id} id={p.id} className="scroll-mt-8 border-2 border-borde bg-carbon p-5 text-sm text-gris">
      <h2 className="display text-2xl text-cian">{p.nombre} · {p.estado}</h2>
      <p className="mt-2 break-all">Pedido: {p.id}</p>
      <p className="my-2 text-xl text-white">{pesos(p.total_centavos / 100)} MXN</p>
      <p>{p.correo} · {p.telefono}</p>
      <p>Vencimiento del apartado: {p.vence} · Mérida</p>
      {p.notas && <p className="mt-2 whitespace-pre-wrap">{p.notas}</p>}
      {p.motivo_revision && <p className="my-3 border-l-2 border-vivo pl-3 text-white">{p.motivo_revision}</p>}
      <ul className="my-3 space-y-4 text-white">{sesiones.filter(s => s.pedido_id === p.id).map((s, i) => <li key={i}>
        <p>{s.desde}–{s.hasta.slice(11)}</p>
        <ul className="mt-1 space-y-1 text-gris">{(s.conceptos as { nombre: string; cantidad: number; unidad: string; subtotalCentavos: number }[]).map((c, j) => <li key={j}>{c.nombre} · {c.cantidad} {c.unidad} · {pesos(c.subtotalCentavos / 100)}</li>)}</ul>
      </li>)}</ul>
      <p className="break-all">Preferencia: {p.preferencia_id ?? "Sin crear"}</p>
      <ul className="mt-2">{pagos.filter(pago => pago.pedido_id === p.id).map(pago => <li key={pago.id}>Pago {pago.id}: {pago.estado} · {pago.detalle}</li>)}</ul>
    </article>)}</div>
  </>;
}
