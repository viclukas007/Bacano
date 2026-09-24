"use client";

import { useActionState } from "react";
import { cambiarClave, type Estado } from "@/app/admin/acciones";
import { Aviso, Boton, Campo, Entrada } from "@/app/admin/_ui/campos";

export function FormularioClave() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    cambiarClave,
    null,
  );

  return (
    <form action={accion} className="flex max-w-[420px] flex-col gap-5">
      <Campo etiqueta="Clave actual">
        <Entrada name="actual" type="password" required autoComplete="current-password" />
      </Campo>
      <Campo etiqueta="Clave nueva" ayuda="Mínimo 10 caracteres.">
        <Entrada name="nueva" type="password" required minLength={10} autoComplete="new-password" />
      </Campo>
      <Campo etiqueta="Repetir la clave nueva">
        <Entrada name="repetida" type="password" required minLength={10} autoComplete="new-password" />
      </Campo>
      {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Boton disabled={pendiente}>{pendiente ? "Guardando…" : "Cambiar la clave"}</Boton>
    </form>
  );
}
