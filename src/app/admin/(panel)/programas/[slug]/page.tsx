import { notFound } from "next/navigation";
import { contarEpisodiosDe, obtenerPrograma } from "@/lib/admin";
import { ProgramaForm } from "@/app/admin/_ui/programa-form";

const ERRORES: Record<string, string> = {
  "con-episodios": "No se puede borrar un programa con episodios. Marcalo como oculto.",
};

export default async function EditarPrograma({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  const [programa, episodios] = await Promise.all([
    obtenerPrograma(slug),
    contarEpisodiosDe(slug),
  ]);
  if (!programa) notFound();

  return (
    <>
      <h1 className="display mb-6 text-[2.5rem] text-white">{programa.nombre}</h1>
      <ProgramaForm
        programa={programa}
        episodios={episodios}
        errorInicial={error ? ERRORES[error] : undefined}
      />
    </>
  );
}
