import { notFound } from "next/navigation";
import { obtenerReserva } from "@/lib/admin";
import { diaDe, horaDe } from "@/lib/estudio";
import { ReservaForm } from "@/app/admin/_ui/reserva-form";

export default async function EditarReserva({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const reserva = await obtenerReserva(Number(id));
  if (!reserva) notFound();

  return (
    <>
      <h1 className="display mb-6 text-[2.5rem] text-white">{reserva.quien}</h1>
      <ReservaForm
        reserva={reserva}
        fecha={diaDe(reserva.desde)}
        inicio={horaDe(reserva.desde)}
        fin={horaDe(reserva.hasta)}
      />
    </>
  );
}
