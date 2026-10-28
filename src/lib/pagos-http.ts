import { NextResponse } from "next/server";
import { ErrorPago } from "./pagos-estudio-reglas";

export const COOKIE_PEDIDO = "bacano_estudio";
export async function leerJsonLimitado(request: Request, limite = 65536): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ErrorPago("Envía el pedido como JSON.", 415);
  if (Number(request.headers.get("content-length")) > limite) throw new ErrorPago("El pedido es demasiado grande.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ErrorPago("Faltan los datos del pedido.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limite) { await reader.cancel(); throw new ErrorPago("El pedido es demasiado grande.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ErrorPago("No pudimos leer el pedido."); }
}
export function respuestaError(error: unknown) {
  if (!(error instanceof ErrorPago)) console.error("[pagos] fallo interno", (error as { code?: string }).code ?? "sin código");
  return NextResponse.json({ error: error instanceof ErrorPago ? error.message : "No pudimos procesar el pedido. Intenta de nuevo." }, { status: error instanceof ErrorPago ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
