import Link from "next/link";
import { listarReservas } from "@/lib/admin";
import {
  fechaValida,
  hoyEnMerida,
  lunesDe,
  rangoSemana,
  sumarDias,
} from "@/lib/estudio";
import { ListaSemana, Semana } from "@/app/admin/_ui/semana";

const NAVEGACION =
  "display border-2 border-borde px-3.5 py-2 text-[14px] tracking-[0.06em] text-white hover:border-cian hover:text-cian";

export default async function Estudio({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const hoy = hoyEnMerida();
  // Cualquier día sirve para elegir la semana; se muestra la del lunes.
  const lunes = lunesDe(semana && fechaValida(semana) ? semana : hoy);
  const esEstaSemana = lunes === lunesDe(hoy);
  const reservas = await listarReservas(
    `${lunes} 00:00`,
    `${sumarDias(lunes, 7)} 00:00`,
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2.5rem] text-white">Estudio</h1>
          <p className="mt-1 text-[14px] text-gris">
            Quién ocupa el estudio y cuándo. Dos reservas no pueden pisarse:
            si chocan, no se guarda.
          </p>
        </div>
        <Link
          href={`/admin/estudio/nueva?fecha=${esEstaSemana ? hoy : lunes}`}
          className="display bg-cian px-5 py-3 text-[16px] tracking-[0.06em] text-tinta hover:bg-white"
        >
          + Reserva
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/admin/estudio?semana=${sumarDias(lunes, -7)}`} className={NAVEGACION}>
          ← Anterior
        </Link>
        <Link href="/admin/estudio" className={NAVEGACION}>
          Hoy
        </Link>
        <Link href={`/admin/estudio?semana=${sumarDias(lunes, 7)}`} className={NAVEGACION}>
          Siguiente →
        </Link>
        <p className="display ml-1 text-[20px] text-white">{rangoSemana(lunes)}</p>
      </div>

      <Semana lunes={lunes} hoy={hoy} reservas={reservas} />

      <h2 className="display mt-10 mb-4 text-[1.5rem] text-white">
        Reservas de la semana
      </h2>
      <ListaSemana reservas={reservas} />
    </>
  );
}
