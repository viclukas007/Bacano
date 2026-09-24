import { notFound } from "next/navigation";
import { listarProgramas, obtenerEpisodio } from "@/lib/admin";
import { EpisodioForm } from "@/app/admin/_ui/episodio-form";

export default async function EditarEpisodio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [episodio, programas] = await Promise.all([
    obtenerEpisodio(id),
    listarProgramas(),
  ]);
  if (!episodio) notFound();

  return (
    <>
      <h1 className="display mb-6 text-[2.5rem] text-white">Editar episodio</h1>
      <EpisodioForm episodio={episodio} programas={programas} />
    </>
  );
}
