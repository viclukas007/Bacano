"use client";

import { useActionState } from "react";
import { revisarYouTube, type Estado } from "@/app/admin/acciones";
import { Aviso, Boton } from "@/app/admin/_ui/campos";

/** Revisa el canal ahora, sin esperar los 15 minutos. */
export function BotonYouTube() {
  const [estado, accion, pendiente] = useActionState<Estado>(
    revisarYouTube,
    null,
  );

  return (
    <form action={accion} className="contents">
      <Boton variante="secundario" disabled={pendiente}>
        {pendiente ? "Revisando…" : "Revisar YouTube"}
      </Boton>
      {estado && (
        <div className="basis-full">
          <Aviso tipo={estado.error ? "error" : "ok"}>
            {estado.error ?? estado.mensaje}
          </Aviso>
        </div>
      )}
    </form>
  );
}
