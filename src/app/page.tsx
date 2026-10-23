import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { ShowBands } from "@/components/show-bands";
import { VerOEscuchar } from "@/components/ver-o-escuchar";
import { Archivo } from "@/components/archivo";
import { Newsletter } from "@/components/newsletter";
import { RentaEstudio } from "@/components/renta-estudio";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFlotante } from "@/components/whatsapp-flotante";
import { fechaCorta, getEpisodios } from "@/lib/content";

// La home se arma en cada petición, pero con el contenido que `content.ts`
// guarda en caché: se refresca solo cada 15 minutos (y ahí se revisa el
// canal de YouTube) o cuando el admin guarda algo. Así el build no necesita
// la base.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const episodios = await getEpisodios();

  // Las fechas se formatean acá, en el servidor, y viajan ya listas: así el
  // componente cliente del archivo no repite la lógica ni arriesga que el
  // servidor y el navegador escriban cosas distintas.
  const fechas = Object.fromEntries(
    episodios.map((e) => [e.id, fechaCorta(e.fecha)]),
  );

  return (
    <>
      <SiteHeader />

      <main>
        <Hero />
        <Ticker />
        <ShowBands />

        <section id="archivo" className="px-5 pb-14 sm:px-8 lg:px-11 lg:pb-16">
          <h2 className="display mb-3 text-[clamp(2.25rem,7vw,4.75rem)] text-white">
            Ver o escuchar
          </h2>
          <p className="mb-8 max-w-[680px] text-base leading-relaxed text-gris sm:text-lg">
            Fantoches sale en vivo y queda grabado. Los otros dos se graban. Y
            de los tres, solo El Show sin Dinos tiene además versión en audio.
          </p>

          <div className="mb-11">
            <VerOEscuchar />
          </div>

          <Archivo episodios={episodios} fechas={fechas} />
        </section>

        <RentaEstudio semana={semana} />

        <Newsletter />
      </main>

      <SiteFooter />
      <WhatsAppFlotante />
    </>
  );
}
