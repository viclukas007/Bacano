import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { conciliarPedido, obtenerPedidoPublico } from "@/lib/pagos-estudio";
import { sql } from "@/lib/db";
import { pagosHabilitados } from "@/lib/mercado-pago";
import { COOKIE_PEDIDO, respuestaError } from "@/lib/pagos-http";

export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const propietario = request.cookies.get(COOKIE_PEDIDO)?.value ?? "";
    let pedido = await obtenerPedidoPublico(id, propietario);
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado en este navegador." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (pagosHabilitados() && !["aprobado", "revision"].includes(pedido.estado)) {
      const reclamados = await sql`UPDATE estudio_pedidos SET conciliado_en = now() WHERE id = ${id} AND preferencia_id IS NOT NULL AND (conciliado_en IS NULL OR conciliado_en < now() - interval '15 seconds') RETURNING id`;
      if (reclamados.length) {
        try { await conciliarPedido(id); revalidateTag("estudio", { expire: 0 }); } catch { /* El webhook y el mantenimiento reintentan; se muestra el estado confirmado de DB. */ }
        pedido = await obtenerPedidoPublico(id, propietario);
      }
    }
    return NextResponse.json(pedido, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return respuestaError(error); }
}
