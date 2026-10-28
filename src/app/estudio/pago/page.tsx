import { cookies } from "next/headers";
import { obtenerPedidoPublico } from "@/lib/pagos-estudio";
import { COOKIE_PEDIDO } from "@/lib/pagos-http";
import { ResultadoPago } from "@/components/resultado-pago";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu reserva · Bacano", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Pago({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido: id } = await searchParams;
  const propietario = (await cookies()).get(COOKIE_PEDIDO)?.value ?? "";
  const pedido = id ? await obtenerPedidoPublico(id, propietario) : undefined;
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-16"><ResultadoPago inicial={pedido ? JSON.parse(JSON.stringify(pedido)) : null} /></main>;
}
