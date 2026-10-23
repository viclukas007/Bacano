import { site } from "@/content/site";
import { IconWhatsApp } from "@/components/icons";

/**
 * Globo fijo abajo a la derecha que abre WhatsApp con "Quiero rentar el
 * estudio" ya escrito. Va en la home y no en el layout, para que no salga
 * en el admin. En pantalla grande, al pasar el mouse asoma una etiqueta.
 */
export function WhatsAppFlotante() {
  return (
    <a
      href={site.whatsapp.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Rentar el estudio por WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 sm:bottom-7 sm:right-7"
    >
      <span className="display pointer-events-none hidden translate-x-2 border-2 border-cian bg-tinta px-3.5 py-2 text-[14px] tracking-[0.06em] text-white opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block">
        Rentá el estudio
      </span>
      <span className="flex size-14 items-center justify-center rounded-full bg-cian text-tinta shadow-[4px_4px_0_0_var(--color-morado)] transition group-hover:-translate-y-0.5 group-hover:bg-white sm:size-16">
        <IconWhatsApp size={30} />
      </span>
    </a>
  );
}
