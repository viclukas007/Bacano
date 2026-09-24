import Link from "next/link";
import { listarEpisodios } from "@/lib/admin";
import { fechaCorta } from "@/lib/content";
import { BotonYouTube } from "@/app/admin/_ui/boton-youtube";

export default async function Episodios() {
  const episodios = await listarEpisodios();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2.5rem] text-white">Episodios</h1>
          <p className="mt-1 text-[14px] text-gris">
            Lo nuevo del canal entra solo cada 15 minutos. Acá se corrige,
            se oculta o se agrega lo que el canal no tiene.
          </p>
        </div>
        <div className="flex gap-3">
          <BotonYouTube />
          <Link
            href="/admin/episodios/nuevo"
            className="display bg-cian px-5 py-3 text-[16px] tracking-[0.06em] text-tinta hover:bg-white"
          >
            + Episodio
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto border-2 border-borde">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead className="display bg-humo text-[12px] tracking-[0.12em] text-cian">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Programa</th>
              <th className="px-4 py-3">Episodio</th>
              <th className="px-4 py-3">Formatos</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {episodios.map((e) => (
              <tr
                key={e.id}
                className={`border-t border-borde ${e.oculto ? "text-gris-tenue" : "text-white"}`}
              >
                <td className="whitespace-nowrap px-4 py-3">{fechaCorta(e.fecha)}</td>
                <td className="px-4 py-3">{e.programaNombre}</td>
                <td className="px-4 py-3">
                  {e.numero && <span className="text-gris">Ep. {e.numero} · </span>}
                  {e.titulo}
                  {e.detalle && <span className="text-gris"> · {e.detalle}</span>}
                  {e.oculto && (
                    <span className="display ml-2 bg-borde px-1.5 py-0.5 text-[11px] tracking-[0.1em] text-gris">
                      Oculto
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{e.formatos.join(" + ")}</td>
                <td className="px-4 py-3 text-gris">
                  {e.origen === "youtube" ? "YouTube" : "Manual"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/episodios/${e.id}`}
                    className="text-cian hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {episodios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gris">
                  Todavía no hay episodios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
