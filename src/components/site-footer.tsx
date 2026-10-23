import Image from "next/image";
import { site } from "@/content/site";
import { iconosRed } from "@/components/icons";

const LEGALES = [
  { etiqueta: "Términos", href: "#legales" },
  { etiqueta: "Privacidad", href: "#privacidad" },
  { etiqueta: "Anúnciate aquí", href: "#marcas" },
];

export function SiteFooter() {
  return (
    <footer
      id="marcas"
      className="border-t-[3px] border-morado px-5 pb-9 pt-10 sm:px-8 lg:px-11"
    >
      <div className="mb-8 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between lg:gap-14">
        <div>
          <Image
            src="/bacano-logo.png"
            alt={site.nombre}
            width={900}
            height={222}
            className="mb-3.5 h-7 w-auto"
          />
          <p className="max-w-[340px] text-[15px] leading-relaxed text-gris">
            Canal de streaming y podcasts. {site.tagline}
          </p>
        </div>

        <ul className="flex gap-3">
          {site.redes.map((red) => {
            const Icono = iconosRed[red.nombre];
            return (
              <li key={red.nombre}>
                <a
                  href={red.url}
                  aria-label={red.nombre}
                  className="flex size-11 items-center justify-center bg-carbon text-white transition-colors hover:bg-borde"
                >
                  <Icono />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-4 border-t-2 border-borde pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-gris-tenue">
          © {new Date().getFullYear()} {site.nombre} · [Razón social]
        </p>
        <ul className="flex flex-wrap gap-6">
          {LEGALES.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[13px] text-gris-tenue transition-colors hover:text-white"
              >
                {l.etiqueta}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
