import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { configuracionPago } from "@/lib/mercado-pago";
import { iniciarCheckout } from "@/lib/pagos-estudio";
import { ErrorPago, validarPedido } from "@/lib/pagos-estudio-reglas";
import { COOKIE_PEDIDO, leerJsonLimitado, respuestaError } from "@/lib/pagos-http";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let propietario = request.cookies.get(COOKIE_PEDIDO)?.value;
  if (!/^[a-f0-9]{64}$/.test(propietario ?? "")) propietario = randomBytes(32).toString("hex");
  let secure = true;
  let respuesta: NextResponse;
  try {
    const config = configuracionPago();
    secure = config.appUrl.startsWith("https:");
    if (request.headers.get("origin") !== config.appUrl) throw new ErrorPago("Abre el formulario desde el sitio de Bacano.", 403);
    const entrada = await leerJsonLimitado(request);
    const datos = validarPedido(entrada);
    const clave = (entrada as { clave?: string }).clave ?? "";
    const resultado = await iniciarCheckout(datos, propietario!, clave, config);
    respuesta = NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { respuesta = respuestaError(error); }
  // También al fallar la conexión externa: el reintento debe recuperar el mismo pedido.
  respuesta.cookies.set(COOKIE_PEDIDO, propietario!, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  revalidateTag("estudio", { expire: 0 });
  return respuesta;
}
