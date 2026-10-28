import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { configuracionPago } from "@/lib/mercado-pago";
import { procesarPago } from "@/lib/pagos-estudio";
import { ErrorPago, firmaWebhookValida } from "@/lib/pagos-estudio-reglas";
import { leerJsonLimitado, respuestaError } from "@/lib/pagos-http";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const config = configuracionPago();
    const id = request.nextUrl.searchParams.get("data.id") ?? "";
    if (!firmaWebhookValida(request.headers.get("x-signature"), request.headers.get("x-request-id"), id, config.secreto)) throw new ErrorPago("Firma inválida.", 401);
    const cuerpo = await leerJsonLimitado(request, 16384) as { type?: string; data?: { id?: string | number } };
    if (!cuerpo || typeof cuerpo !== "object") throw new ErrorPago("Notificación inválida.");
    if (cuerpo.type !== "payment") return NextResponse.json({ ignorado: true });
    if (!/^\d{1,30}$/.test(id) || String(cuerpo.data?.id) !== id) throw new ErrorPago("El pago no coincide con la notificación firmada.");
    const resultado = await procesarPago(id, config);
    // También en reintentos: si la invalidación falló tras confirmar en DB, vuelve a intentarse.
    revalidateTag("estudio", { expire: 0 });
    return NextResponse.json(resultado);
  } catch (error) { return respuestaError(error); }
}
