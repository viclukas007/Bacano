import type { Show } from "@/lib/types";

/**
 * Los tres programas del canal. El orden es el que se ve en la home.
 */
export const shows: Show[] = [
  {
    slug: "el-show-sin-dinos",
    nombre: "El Show sin Dinos",
    bajada:
      "Entrevistas largas, un invitado por episodio. El único que también sale en audio.",
    cadencia: "SEMANAL",
    modo: "grabado",
    formatos: ["video", "audio"],
    spotifyShowId: "4v9CAI88mbCBenzjL4zi4e",
    paleta: { fondo: "#00EFFF", tinta: "#0A0A0A", secundario: "#0A3A40" },
  },
  {
    slug: "en-minusculas",
    nombre: "en minúsculas",
    bajada: "Libros: lecturas del mes, listas, hallazgos y preguntas raras.",
    cadencia: "MENSUAL",
    modo: "grabado",
    formatos: ["video"],
    paleta: { fondo: "#883EE8", tinta: "#FFFFFF", secundario: "#EDE2FF" },
  },
  {
    slug: "fantoches-del-fantasy",
    nombre: "Fantoches del Fantasy",
    bajada:
      "Fantasy football: waivers y movimientos. Sale en vivo y después queda grabado.",
    cadencia: "SEMANAL EN TEMPORADA",
    modo: "vivo",
    formatos: ["video"],
    horarioVivo: "Lunes 10 PM",
    paleta: { fondo: "#1A1A1A", tinta: "#FFFFFF", secundario: "#A8A8A8" },
  },
];
