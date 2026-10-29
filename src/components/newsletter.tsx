"use client";

import { useActionState } from "react";
import { suscribir, type EstadoSuscripcion } from "@/app/acciones";

const INICIAL: EstadoSuscripcion = null;

export function Newsletter() {
  const [estado, accion, pendiente] = useActionState(suscribir, INICIAL);

  return (
    <section id="avisarme" className="px-5 pb-16 sm:px-8 lg:px-11">
      <div className="flex flex-col gap-8 border-[3px] border-cian p-6 sm:p-9 lg:flex-row lg:items-center lg:gap-11">
        <h2 className="display flex-grow text-[clamp(1.875rem,5.5vw,2.75rem)] text-white">
          Avísame cuando
          <br />
          vuelva Bacano
        </h2>

        <form
          action={accion}
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto"
        >
          <div className="sm:w-[300px]">
            <label
              htmlFor="correo"
              className="display mb-2 block text-[13px] tracking-[0.14em] text-cian sm:text-[14px]"
            >
              Tu correo
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="hola@correo.com"
              aria-describedby={estado ? "correo-estado" : undefined}
              className="w-full border-2 border-borde bg-humo px-4 py-3.5 text-[15px] text-white placeholder:text-gris-tenue focus:border-cian focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={pendiente}
            className="display bg-cian px-6 py-4 text-[17px] tracking-[0.06em] text-tinta transition-colors hover:bg-white disabled:opacity-60"
          >
            {pendiente ? "Mandando…" : "Anotarme"}
          </button>
        </form>
      </div>

      {estado && (
        <p
          id="correo-estado"
          role="status"
          className={`mt-4 text-[15px] ${estado.ok ? "text-cian" : "text-vivo"}`}
        >
          {estado.mensaje}
        </p>
      )}
    </section>
  );
}
