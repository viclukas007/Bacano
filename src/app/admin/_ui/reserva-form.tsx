"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  eliminarReserva,
  guardarReserva,
  type Estado,
} from "@/app/admin/acciones";
import {
  Area,
  Aviso,
  Boton,
  Campo,
  Entrada,
  Selector,
} from "@/app/admin/_ui/campos";
import { NOMBRE_TIPO, type Reserva, type TipoReserva } from "@/lib/estudio";

export function ReservaForm({
  reserva,
  fecha,
  inicio,
  fin,
}: {
  /** Sin reserva, el formulario crea una nueva. */
  reserva?: Reserva;
  /** Día con el que arranca el formulario (el de la reserva, o el elegido). */
  fecha: string;
  inicio?: string;
  fin?: string;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    guardarReserva,
    null,
  );
  const r = reserva;
  // Tras un error, lo que se había tecleado manda sobre lo guardado.
  const v = estado?.valores;
  // La semana se calcula en la página a partir de cualquier día.
  const volver = `/admin/estudio?semana=${fecha}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form action={accion} className="flex flex-col gap-5">
        {r && <input type="hidden" name="idAnterior" value={r.id} />}

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Campo etiqueta="Quién" ayuda="El programa del canal o el cliente que renta.">
            <Entrada
              name="quien"
              defaultValue={v?.quien ?? r?.quien}
              required
              autoFocus
              placeholder="Fantoches del Fantasy"
            />
          </Campo>
          <Campo etiqueta="Tipo">
            {/* Un select no toma un defaultValue nuevo: con la key se remonta. */}
            <Selector
              key={v?.tipo ?? "inicial"}
              name="tipo"
              defaultValue={v?.tipo ?? r?.tipo ?? "renta"}
            >
              {(Object.keys(NOMBRE_TIPO) as TipoReserva[]).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {NOMBRE_TIPO[tipo]}
                </option>
              ))}
            </Selector>
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo etiqueta="Día">
            <Entrada name="fecha" type="date" defaultValue={v?.fecha ?? fecha} required />
          </Campo>
          <Campo etiqueta="Desde">
            <Entrada name="inicio" type="time" defaultValue={v?.inicio ?? inicio} required />
          </Campo>
          <Campo
            etiqueta="Hasta"
            ayuda="Si pasa de medianoche, poné la hora del día siguiente: de 22:00 a 01:00."
          >
            <Entrada name="fin" type="time" defaultValue={v?.fin ?? fin} required />
          </Campo>
        </div>

        <Campo
          etiqueta="Notas"
          ayuda="Equipo que piden, condiciones, lo que haga falta recordar. Opcional."
        >
          <Area name="notas" defaultValue={v?.notas ?? r?.notas} />
        </Campo>

        {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}

        <div className="flex gap-3 pt-2">
          <Boton disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</Boton>
          <Link
            href={volver}
            className="display px-5 py-3 text-[16px] tracking-[0.06em] text-gris hover:text-white"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {r && (
        <aside className="flex flex-col gap-4 border-2 border-borde p-5 text-[14px] text-gris lg:self-start">
          <p>
            <span className="text-white">Reserva</span> #{r.id}
          </p>
          <p className="text-[13px]">
            Si se cancela, borrala para que el hueco quede libre.
          </p>
          <form
            action={eliminarReserva}
            onSubmit={(ev) => {
              if (!confirm("¿Borrar esta reserva?")) ev.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="fecha" value={fecha} />
            <Boton variante="peligro">Borrar</Boton>
          </form>
        </aside>
      )}
    </div>
  );
}
