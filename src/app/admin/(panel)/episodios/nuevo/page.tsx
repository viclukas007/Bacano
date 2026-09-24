import { listarProgramas } from "@/lib/admin";
import { EpisodioForm } from "@/app/admin/_ui/episodio-form";

export default async function NuevoEpisodio() {
  const programas = await listarProgramas();

  return (
    <>
      <h1 className="display mb-6 text-[2.5rem] text-white">Nuevo episodio</h1>
      <EpisodioForm programas={programas} />
    </>
  );
}
