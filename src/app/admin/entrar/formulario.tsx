"use client";

import { useActionState } from "react";
import { entrar, type Estado } from "@/app/admin/acciones";
import { Aviso, Boton, Campo, Entrada } from "@/app/admin/_ui/campos";

export function FormularioEntrar() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    entrar,
    null,
  );

  return (
    <form action={accion} className="flex flex-col gap-5">
      <Campo etiqueta="Clave">
        <Entrada
          name="clave"
          type="password"
          required
          autoComplete="current-password"
          autoFocus
        />
      </Campo>
      {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Boton disabled={pendiente}>{pendiente ? "Entrando…" : "Entrar"}</Boton>
    </form>
  );
}
