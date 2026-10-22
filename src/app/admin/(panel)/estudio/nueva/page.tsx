import { fechaValida, horaValida, hoyEnMerida, sumarHoras } from "@/lib/estudio";
import { ReservaForm } from "@/app/admin/_ui/reserva-form";

export default async function NuevaReserva({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; inicio?: string }>;
}) {
  const { fecha, inicio } = await searchParams;
  const dia = fecha && fechaValida(fecha) ? fecha : hoyEnMerida();
  // Al venir de un hueco de la grilla, arranca a esa hora y dura una hora.
  const desde = inicio && horaValida(inicio) ? inicio : undefined;
  const hasta = desde ? sumarHoras(desde, 1) : undefined;

  return (
    <>
      <h1 className="display mb-6 text-[2.5rem] text-white">Nueva reserva</h1>
      <ReservaForm fecha={dia} inicio={desde} fin={hasta} />
    </>
  );
}
