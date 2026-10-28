import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { prepararBase, sql } from "./db";
import { ErrorPago, esUuid, hashToken, validarPagoMP, type DatosPedido, type PagoMP } from "./pagos-estudio-reglas";
import { buscarPagos, configuracionPago, consultarPago, crearPreferencia, type ConfigPago } from "./mercado-pago";

type Tx = postgres.TransactionSql;
export interface PedidoFila {
  id: string; propietario_hash: string; huella: string; nombre: string; correo: string; telefono: string; notas: string;
  total_centavos: number; estado: string; motivo_revision: string | null; preferencia_id: string | null;
  checkout_url: string | null; pago_aprobado_id: string | null; expira_en: Date; checkout_en_proceso_hasta: Date | null;
}
export async function bloquearEstudio(tx: Tx) { await tx`SELECT pg_advisory_xact_lock(948321, 1)`; }
export async function expirarApartadosTx(tx: Tx) {
  // El mismo bloqueo coordina pedidos, confirmaciones y reservas del administrador.
  await tx`UPDATE estudio_pedidos SET estado = 'expirado', actualizado_en = now()
    WHERE estado IN ('creando','pendiente','rechazado') AND expira_en <= now()`;
  return tx`DELETE FROM reservas WHERE estado = 'apartado' AND expira_en <= now()`;
}
export async function limpiarApartados() {
  await prepararBase();
  return sql.begin(async tx => { await bloquearEstudio(tx); return expirarApartadosTx(tx); });
}
export async function crearPedido(datos: DatosPedido, propietario: string, clave: string, minutos: number): Promise<PedidoFila> {
  if (!esUuid(clave)) throw new ErrorPago("Falta la clave del intento de pago.");
  await prepararBase();
  try {
    return await sql.begin(async tx => {
      await bloquearEstudio(tx);
      await expirarApartadosTx(tx);
      const [existente] = await tx<PedidoFila[]>`SELECT * FROM estudio_pedidos WHERE propietario_hash = ${hashToken(propietario)} AND clave_idempotencia = ${clave}`;
      if (existente) {
        if (existente.huella !== datos.huella) throw new ErrorPago("Ese intento corresponde a otro carrito. Vuelve a intentarlo.", 409);
        return existente;
      }
      // Recupera el checkout al recargar la página o perder la clave en memoria.
      const [mismoCarrito] = await tx<PedidoFila[]>`SELECT * FROM estudio_pedidos WHERE propietario_hash = ${hashToken(propietario)} AND huella = ${datos.huella} AND estado IN ('creando','pendiente','rechazado','aprobado','revision') ORDER BY creado_en DESC LIMIT 1`;
      if (mismoCarrito) return mismoCarrito;
      const [{ n }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM estudio_pedidos WHERE propietario_hash = ${hashToken(propietario)} AND estado IN ('creando','pendiente','rechazado')`;
      if (n >= 3) throw new ErrorPago("Ya tienes varios intentos abiertos. Espera a que venza el apartado anterior.", 429);
      const id = randomUUID();
      const primerInicio = datos.sesiones.map(s => s.desde).sort()[0];
      const [pedido] = await tx<PedidoFila[]>`INSERT INTO estudio_pedidos (id, propietario_hash, clave_idempotencia, huella, nombre, correo, telefono, notas, total_centavos, expira_en)
        VALUES (${id}, ${hashToken(propietario)}, ${clave}, ${datos.huella}, ${datos.contacto.nombre}, ${datos.contacto.correo}, ${datos.contacto.telefono}, ${datos.contacto.notas}, ${datos.totalCentavos}, LEAST(now() + ${minutos} * interval '1 minute', ${primerInicio}::timestamp AT TIME ZONE 'America/Merida')) RETURNING *`;
      if (new Date(pedido.expira_en).getTime() <= Date.now()) throw new ErrorPago("El horario elegido ya pasó.", 409);
      for (const [indice, sesion] of datos.sesiones.entries()) {
        await tx`INSERT INTO estudio_pedido_sesiones (pedido_id, indice, desde, hasta, configuracion, conceptos, total_centavos)
          VALUES (${id}, ${indice}, ${sesion.desde}, ${sesion.hasta}, ${tx.json(sesion.configuracion)}, ${tx.json(sesion.conceptos)}, ${sesion.totalCentavos})`;
        await tx`INSERT INTO reservas (quien, tipo, desde, hasta, notas, pedido_id, sesion_indice, estado, expira_en)
          VALUES (${datos.contacto.nombre}, 'renta', ${sesion.desde}, ${sesion.hasta}, ${`Apartado del pedido ${id}`}, ${id}, ${indice}, 'apartado', ${pedido.expira_en})`;
      }
      return pedido;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23P01") throw new ErrorPago("Uno de los horarios se acaba de ocupar. Actualiza el calendario y elige otro.", 409);
    throw error;
  }
}

export async function iniciarCheckout(datos: DatosPedido, propietario: string, clave: string, config = configuracionPago()) {
  let pedido = await crearPedido(datos, propietario, clave, config.minutos);
  if (["aprobado", "revision"].includes(pedido.estado)) return { pedido: pedido.id, url: `${config.appUrl}/estudio/pago?pedido=${pedido.id}` };
  if (pedido.estado === "expirado") throw new ErrorPago("El apartado venció. Inicia un nuevo intento de pago.", 410);
  if (pedido.checkout_url) return { pedido: pedido.id, url: pedido.checkout_url };
  const [reclamado] = await sql<PedidoFila[]>`UPDATE estudio_pedidos SET checkout_en_proceso_hasta = now() + interval '30 seconds'
    WHERE id = ${pedido.id} AND preferencia_id IS NULL AND expira_en > now()
    AND (checkout_en_proceso_hasta IS NULL OR checkout_en_proceso_hasta < now()) RETURNING *`;
  if (!reclamado) throw new ErrorPago("Tu enlace de pago se está preparando. Intenta de nuevo en unos segundos.", 409);
  try {
    const preferencia = await crearPreferencia(pedido, config);
    const [actualizado] = await sql<PedidoFila[]>`UPDATE estudio_pedidos SET preferencia_id = ${preferencia.id}, checkout_url = ${preferencia.checkout}, estado = CASE WHEN estado = 'creando' THEN 'pendiente' ELSE estado END, checkout_en_proceso_hasta = NULL, actualizado_en = now()
      WHERE id = ${pedido.id} AND expira_en > now() RETURNING *`;
    if (!actualizado) throw new ErrorPago("El apartado venció. Inicia un nuevo intento de pago.", 410);
    pedido = actualizado;
    return { pedido: pedido.id, url: pedido.checkout_url! };
  } catch (error) {
    await sql`UPDATE estudio_pedidos SET checkout_en_proceso_hasta = NULL WHERE id = ${pedido.id}`;
    // Un timeout puede haber creado una preferencia: se conserva el pedido y su apartado.
    throw error;
  }
}

export async function aplicarPago(pago: PagoMP, config: ConfigPago) {
  if (!esUuid(pago.external_reference)) return { ignorado: true };
  await prepararBase();
  return sql.begin(async tx => {
    await bloquearEstudio(tx);
    await expirarApartadosTx(tx);
    const [pedido] = await tx<PedidoFila[]>`SELECT * FROM estudio_pedidos WHERE id = ${pago.external_reference} FOR UPDATE`;
    if (!pedido) return { ignorado: true };
    validarPagoMP(pago, pedido, config.vendedor, config.produccion);
    const pagoId = String(pago.id);
    const [previo] = await tx<{ actualizado_mp: Date; pedido_id: string }[]>`SELECT actualizado_mp, pedido_id FROM estudio_pagos WHERE id = ${pagoId}`;
    if (previo && previo.pedido_id !== pedido.id) throw new ErrorPago("El pago ya pertenece a otro pedido.", 422);
    if (previo && new Date(previo.actualizado_mp).getTime() > Date.parse(pago.date_last_updated)) return { ignorado: true };
    await tx`INSERT INTO estudio_pagos (id, pedido_id, estado, detalle, importe_centavos, reembolsado_centavos, actualizado_mp)
      VALUES (${pagoId}, ${pedido.id}, ${pago.status}, ${pago.status_detail ?? ""}, ${Math.round(pago.transaction_amount * 100)}, ${Math.round((pago.transaction_amount_refunded ?? 0) * 100)}, ${pago.date_last_updated})
      ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, detalle = EXCLUDED.detalle, reembolsado_centavos = EXCLUDED.reembolsado_centavos, actualizado_mp = EXCLUDED.actualizado_mp, actualizado_en = now()`;
    const revision = async (motivo: string) => {
      await tx`UPDATE estudio_pedidos SET estado = 'revision', motivo_revision = ${motivo}, actualizado_en = now() WHERE id = ${pedido.id}`;
    };
    if (["refunded", "charged_back"].includes(pago.status) || (pago.transaction_amount_refunded ?? 0) > 0) {
      await revision("Mercado Pago reportó un reembolso o contracargo. Revisar el pago y la reserva.");
      return { revision: true };
    }
    if (pago.status === "approved") {
      if (pedido.pago_aprobado_id === pagoId) return { aprobado: true }; // Repetidos no recrean reservas.
      if (pedido.pago_aprobado_id) { await revision("Se recibió un segundo pago aprobado para el mismo pedido."); return { revision: true }; }
      const [{ n: apartados }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM reservas WHERE pedido_id = ${pedido.id} AND estado = 'apartado' AND expira_en > now()`;
      const [{ n: sesiones }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM estudio_pedido_sesiones WHERE pedido_id = ${pedido.id}`;
      if (!["creando", "pendiente", "rechazado"].includes(pedido.estado) || apartados !== sesiones || !sesiones) {
        await revision("El pago se aprobó después de liberar el apartado o el pedido requiere revisión. No hay reserva confirmada automáticamente.");
        return { revision: true };
      }
      await tx`UPDATE reservas SET estado = 'confirmada', expira_en = NULL, notas = ${`Pago verificado. Pedido ${pedido.id}. Contacto: ${pedido.correo} / ${pedido.telefono}. ${pedido.notas}`}, actualizado_en = now() WHERE pedido_id = ${pedido.id}`;
      await tx`UPDATE estudio_pedidos SET estado = 'aprobado', pago_aprobado_id = ${pagoId}, actualizado_en = now() WHERE id = ${pedido.id}`;
      return { aprobado: true };
    }
    // Eventos pendientes/rechazados nunca degradan pedidos aprobados, vencidos o en revisión.
    if (["creando", "pendiente", "rechazado"].includes(pedido.estado)) {
      const estado = ["rejected", "cancelled"].includes(pago.status) ? "rechazado" : "pendiente";
      await tx`UPDATE estudio_pedidos SET estado = ${estado}, actualizado_en = now() WHERE id = ${pedido.id}`;
    }
    return { actualizado: true };
  });
}

export async function procesarPago(id: string, config = configuracionPago()) {
  const pago = await consultarPago(id, config);
  if (String(pago.id) !== id) throw new ErrorPago("El identificador del pago no coincide.", 422);
  return aplicarPago(pago, config);
}
export async function conciliarPedido(id: string, config = configuracionPago()) {
  const pagos = await buscarPagos(id, config);
  // Más viejos primero: se conserva el resultado más reciente de cada pago.
  for (const pago of [...pagos].reverse()) await procesarPago(String(pago.id), config);
  await sql`UPDATE estudio_pedidos SET conciliado_en = now() WHERE id = ${id}`;
}
export async function obtenerPedidoPublico(id: string, propietario: string) {
  if (!esUuid(id) || !propietario) return undefined;
  await limpiarApartados();
  const [pedido] = await sql<PedidoFila[]>`SELECT * FROM estudio_pedidos WHERE id = ${id} AND propietario_hash = ${hashToken(propietario)}`;
  if (!pedido) return undefined;
  const sesiones = await sql<{ desde: string; hasta: string; conceptos: unknown; total_centavos: number }[]>`SELECT to_char(desde,'YYYY-MM-DD HH24:MI') AS desde, to_char(hasta,'YYYY-MM-DD HH24:MI') AS hasta, conceptos, total_centavos FROM estudio_pedido_sesiones WHERE pedido_id = ${id} ORDER BY indice`;
  return { id: pedido.id, estado: pedido.estado, totalCentavos: pedido.total_centavos, expiraEn: pedido.expira_en, sesiones };
}

export async function mantenimientoPagos() {
  await limpiarApartados();
  const config = configuracionPago();
  // Incluye vencidos recientes: los pagos tardíos deben aparecer en revisión.
  const pedidos = await sql<{ id: string }[]>`SELECT id FROM estudio_pedidos WHERE estado IN ('creando','pendiente','rechazado','expirado')
    AND creado_en > now() - interval '7 days' AND preferencia_id IS NOT NULL
    AND (conciliado_en IS NULL OR conciliado_en < now() - interval '1 minute') ORDER BY conciliado_en NULLS FIRST LIMIT 10`;
  const errores: string[] = [];
  for (const pedido of pedidos) {
    try { await conciliarPedido(pedido.id, config); } catch { errores.push(pedido.id); }
  }
  return { revisados: pedidos.length, errores };
}
