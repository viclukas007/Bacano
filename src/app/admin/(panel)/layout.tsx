import Link from "next/link";
import { exigirSesion } from "@/lib/auth";
import { salir } from "@/app/admin/acciones";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const SECCIONES = [
  { href: "/admin", etiqueta: "Episodios" },
  { href: "/admin/programas", etiqueta: "Programas" },
  { href: "/admin/estudio", etiqueta: "Estudio" },
  { href: "/admin/clave", etiqueta: "Clave" },
];

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirSesion();

  return (
    <>
      <header className="border-b-2 border-borde px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <Link href="/admin" className="display text-[22px] text-cian">
            Bacano · Admin
          </Link>
          <nav className="flex gap-5">
            {SECCIONES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="text-[15px] text-white hover:text-cian"
              >
                {s.etiqueta}
              </Link>
            ))}
            <Link href="/" className="text-[15px] text-gris hover:text-cian">
              Ver el sitio ↗
            </Link>
          </nav>
          <form action={salir} className="ml-auto">
            <button type="submit" className="text-[14px] text-gris hover:text-vivo">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-8">
        {children}
      </main>
    </>
  );
}
