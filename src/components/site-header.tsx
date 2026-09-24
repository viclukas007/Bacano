"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { IconCerrar, IconMenu } from "@/components/icons";

export function SiteHeader() {
  const [abierto, setAbierto] = useState(false);

  // El menú ocupa la pantalla entera en móvil: mientras está abierto, el
  // fondo no debe poder desplazarse.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-cian bg-tinta">
      <div className="flex h-16 items-center gap-6 px-5 sm:px-8 lg:h-[76px] lg:gap-10 lg:px-11">
        <a
          href="#top"
          aria-label={`${site.nombre} — inicio`}
          className="flex shrink-0 items-center"
        >
          <Image
            src="/bacano-logo.png"
            alt={site.nombre}
            width={900}
            height={222}
            priority
            className="h-5 w-auto lg:h-6"
          />
        </a>

        <nav
          aria-label="Principal"
          className="display hidden flex-grow items-center gap-7 tracking-[0.06em] lg:flex"
        >
          {site.navegacion.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[17px] text-white transition-colors hover:text-cian"
            >
              {item.etiqueta}
            </a>
          ))}
        </nav>

        <div className="flex flex-grow items-center justify-end gap-3 lg:flex-grow-0">
          <a
            href="#avisarme"
            className="display flex items-center gap-2.5 bg-vivo px-3.5 py-2.5 text-[13px] tracking-[0.1em] text-white sm:px-5 sm:text-[16px]"
          >
            <span
              aria-hidden
              className="block size-2 rounded-full bg-white sm:size-[9px]"
            />
            Volvimos el {site.relanzamiento.etiqueta}
          </a>

          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir el menú"
            aria-expanded={abierto}
            className="flex size-11 items-center justify-center text-white lg:hidden"
          >
            <IconMenu />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-tinta lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <Image
              src="/bacano-logo.png"
              alt={site.nombre}
              width={900}
              height={222}
              className="h-5 w-auto"
            />
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el menú"
              className="flex size-11 items-center justify-center text-white"
            >
              <IconCerrar />
            </button>
          </div>

          <nav
            aria-label="Principal"
            className="flex flex-col gap-1 px-5 pt-6"
          >
            {site.navegacion.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setAbierto(false)}
                className="display border-b-2 border-borde py-5 text-[34px] text-white"
              >
                {item.etiqueta}
              </a>
            ))}
          </nav>

          <div className="mt-auto px-5 pb-10 pt-8">
            <a
              href={site.youtube.url}
              className="display block bg-cian px-6 py-4 text-center text-[19px] tracking-[0.06em] text-tinta"
            >
              Ver en YouTube
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
