import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, tokenValido } from "@/lib/auth-token";

/**
 * Manda a la pantalla de entrada a quien llega al admin sin sesión. Es solo
 * comodidad: cada consulta y acción del admin vuelve a comprobar la sesión.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/entrar") return NextResponse.next();

  const token = request.cookies.get(COOKIE_SESION)?.value;
  if (await tokenValido(token)) return NextResponse.next();

  const destino = new URL("/admin/entrar", request.url);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: "/admin/:path*",
};
