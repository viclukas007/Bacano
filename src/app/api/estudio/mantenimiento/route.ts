import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { mantenimientoPagos } from "@/lib/pagos-estudio";
import { hashToken } from "@/lib/pagos-estudio-reglas";
import { respuestaError } from "@/lib/pagos-http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secreto = process.env.ESTUDIO_CRON_SECRET ?? "";
  const recibido = request.headers.get("authorization") ?? "";
  if (secreto.length < 32 || !timingSafeEqual(Buffer.from(hashToken(recibido)), Buffer.from(hashToken(`Bearer ${secreto}`)))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const resultado = await mantenimientoPagos();
    revalidateTag("estudio", { expire: 0 });
    return NextResponse.json(resultado, { status: resultado.errores.length ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return respuestaError(error); }
}
