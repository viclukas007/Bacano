import { redirect } from "next/navigation";
import { haySesion } from "@/lib/auth";
import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar al admin", robots: { index: false } };

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ clave?: string }>;
}) {
  if (await haySesion()) redirect("/admin");
  const { clave } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center px-5">
      <div className="w-full max-w-[380px] border-[3px] border-cian p-7 sm:p-9">
        <p className="display mb-2 text-[13px] tracking-[0.14em] text-cian">
          Bacano Media
        </p>
        <h1 className="display mb-7 text-[2.25rem] text-white">Admin</h1>
        {clave === "cambiada" && (
          <p className="mb-5 border-2 border-cian px-4 py-3 text-[14px] text-cian">
            Clave cambiada. Entrá con la nueva.
          </p>
        )}
        <FormularioEntrar />
      </div>
    </main>
  );
}
