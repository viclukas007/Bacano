import Link from "next/link";
import { listarProgramas } from "@/lib/admin";
import { etiquetaDistribucion } from "@/lib/content";

export default async function Programas() {
  const programas = await listarProgramas();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2.5rem] text-white">Programas</h1>
          <p className="mt-1 text-[14px] text-gris">
            El feed reconoce cada programa por su nombre (o sus alias) en el
            título del video.
          </p>
        </div>
        <Link
          href="/admin/programas/nuevo"
          className="display bg-cian px-5 py-3 text-[16px] tracking-[0.06em] text-tinta hover:bg-white"
        >
          + Programa
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {programas.map((p) => (
          <li key={p.slug} className={p.oculto ? "opacity-50" : ""}>
            <Link
              href={`/admin/programas/${p.slug}`}
              className="block border-[3px] border-transparent p-5 transition-colors hover:border-cian"
              style={{ background: p.paleta.fondo, color: p.paleta.tinta }}
            >
              <p
                className="display mb-2 text-[12px] tracking-[0.14em]"
                style={{ color: p.paleta.secundario }}
              >
                {etiquetaDistribucion(p)}
                {p.oculto && " · OCULTO"}
              </p>
              <p className="display text-[1.75rem] leading-tight">{p.nombre}</p>
              <p className="mt-2 text-[14px]" style={{ color: p.paleta.secundario }}>
                {p.bajada || "Sin bajada."}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
