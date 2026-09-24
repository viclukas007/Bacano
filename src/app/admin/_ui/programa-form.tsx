"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  eliminarPrograma,
  guardarPrograma,
  type Estado,
} from "@/app/admin/acciones";
import {
  Area,
  Aviso,
  Boton,
  Campo,
  Casilla,
  Entrada,
  Selector,
} from "@/app/admin/_ui/campos";
import type { Modo, Show } from "@/lib/types";

function aSlug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProgramaForm({
  programa,
  episodios = 0,
  errorInicial,
}: {
  /** Sin programa, el formulario crea uno nuevo. */
  programa?: Show;
  /** Cuántos episodios tiene: con alguno no se puede borrar. */
  episodios?: number;
  errorInicial?: string;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    guardarPrograma,
    errorInicial ? { error: errorInicial } : null,
  );
  const p = programa;
  const [modo, setModo] = useState<Modo>(p?.modo ?? "grabado");
  const [slug, setSlug] = useState(p?.slug ?? "");
  const [slugTocado, setSlugTocado] = useState(Boolean(p));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form action={accion} className="flex flex-col gap-5">
        {p && <input type="hidden" name="slugAnterior" value={p.slug} />}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Nombre" ayuda="Tal cual aparece en los títulos de YouTube.">
            <Entrada
              name="nombre"
              defaultValue={p?.nombre}
              required
              onChange={(ev) => {
                if (!slugTocado) setSlug(aSlug(ev.target.value));
              }}
            />
          </Campo>
          <Campo etiqueta="Slug" ayuda="Identificador en minúsculas. Mejor no cambiarlo después.">
            <Entrada
              name="slug"
              value={slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              onChange={(ev) => {
                setSlugTocado(true);
                setSlug(ev.target.value);
              }}
            />
          </Campo>
        </div>

        <Campo etiqueta="Bajada" ayuda="Una o dos líneas que describen el programa.">
          <Area name="bajada" rows={2} defaultValue={p?.bajada} />
        </Campo>

        <Campo
          etiqueta="Otros nombres en YouTube"
          ayuda="Separados por coma. Sirve si el canal lo escribe distinto: 'Fantoches, FDF'."
        >
          <Entrada name="alias" defaultValue={p?.alias?.join(", ")} />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo etiqueta="Cadencia" ayuda="SEMANAL, MENSUAL…">
            <Entrada name="cadencia" defaultValue={p?.cadencia} />
          </Campo>
          <Campo etiqueta="Modo">
            <Selector
              name="modo"
              value={modo}
              onChange={(ev) => setModo(ev.target.value as Modo)}
            >
              <option value="grabado">Grabado</option>
              <option value="vivo">En vivo</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Orden" ayuda="Menor va primero.">
            <Entrada name="orden" type="number" defaultValue={p?.orden ?? 0} />
          </Campo>
        </div>

        {modo === "vivo" && (
          <Campo etiqueta="Horario del en vivo" ayuda="Como se muestra: 'Lunes 10 PM'.">
            <Entrada name="horarioVivo" defaultValue={p?.horarioVivo} />
          </Campo>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="display mb-1.5 block text-[13px] tracking-[0.14em] text-cian">
              Formatos
            </span>
            <div className="flex gap-5 pt-2.5">
              <Casilla
                etiqueta="Video"
                name="formatos"
                value="video"
                defaultChecked={p ? p.formatos.includes("video") : true}
              />
              <Casilla
                etiqueta="Audio"
                name="formatos"
                value="audio"
                defaultChecked={p?.formatos.includes("audio")}
              />
            </div>
          </div>
          <Campo etiqueta="ID del show en Spotify" ayuda="Solo si tiene feed de audio.">
            <Entrada name="spotifyShowId" defaultValue={p?.spotifyShowId} />
          </Campo>
        </div>

        <fieldset className="border-2 border-borde p-4">
          <legend className="display px-2 text-[13px] tracking-[0.14em] text-cian">
            Colores de la banda
          </legend>
          <div className="grid gap-5 sm:grid-cols-3">
            {(
              [
                ["fondo", "Fondo", "#1A1A1A"],
                ["tinta", "Texto", "#FFFFFF"],
                ["secundario", "Texto secundario", "#A8A8A8"],
              ] as const
            ).map(([campo, etiqueta, porDefecto]) => (
              <Campo key={campo} etiqueta={etiqueta}>
                <Entrada
                  name={campo}
                  type="color"
                  defaultValue={p?.paleta[campo] ?? porDefecto}
                  className="h-12 p-1"
                />
              </Campo>
            ))}
          </div>
        </fieldset>

        <Casilla
          etiqueta="Oculto (no se muestra ni recibe episodios del feed)"
          name="oculto"
          defaultChecked={p?.oculto}
        />

        {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}

        <div className="flex gap-3 pt-2">
          <Boton disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</Boton>
          <Link
            href="/admin/programas"
            className="display px-5 py-3 text-[16px] tracking-[0.06em] text-gris hover:text-white"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {p && (
        <aside className="flex flex-col gap-4 border-2 border-borde p-5 text-[14px] text-gris lg:self-start">
          <p>
            <span className="text-white">Episodios:</span> {episodios}
          </p>
          {episodios > 0 ? (
            <p className="text-[13px]">
              Con episodios no se puede borrar. Si dejó de existir, marcalo
              como oculto.
            </p>
          ) : (
            <form
              action={eliminarPrograma}
              onSubmit={(ev) => {
                if (!confirm("¿Borrar este programa?")) ev.preventDefault();
              }}
            >
              <input type="hidden" name="slug" value={p.slug} />
              <Boton variante="peligro">Borrar</Boton>
            </form>
          )}
        </aside>
      )}
    </div>
  );
}
