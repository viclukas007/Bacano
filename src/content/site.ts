/**
 * Datos del canal. Todo lo que está entre corchetes falta confirmar.
 */
export const site = {
  nombre: "Bacano Media",
  tagline: "Nadie es tan importante, nada es tan serio.",
  descripcion:
    "Canal de streaming y podcasts. Entrevistas, libros y fantasy football.",
  url: "https://bacano.mx",

  relanzamiento: {
    /** Fecha del relanzamiento en ISO: lunes 21, en vivo a las 22:00. */
    fecha: "2026-09-21" as string | null,
    /** Cómo se muestra en los textos del sitio. */
    etiqueta: "21 SEP",
  },

  youtube: {
    handle: "@BacanoMedia",
    url: "https://www.youtube.com/@BacanoMedia",
    canalId: "UCd01rlvbnXqihwh0_tn2w4A",
  },

  spotify: {
    /** El Show sin Dinos. Es el único programa con feed de audio. */
    showId: "4v9CAI88mbCBenzjL4zi4e",
    url: "https://open.spotify.com/show/4v9CAI88mbCBenzjL4zi4e",
  },

  whatsapp: {
    /** El de las rentas del estudio. */
    numero: "+52 1 999 392 3583",
    /** Abre el chat con el mensaje ya escrito. */
    url: `https://wa.me/5219993923583?text=${encodeURIComponent("Quiero rentar el estudio")}`,
  },

  redes: [
    { nombre: "YouTube", url: "https://www.youtube.com/@BacanoMedia" },
    { nombre: "Instagram", url: "https://instagram.com/" },
    { nombre: "TikTok", url: "https://tiktok.com/" },
    { nombre: "Spotify", url: "https://open.spotify.com/show/4v9CAI88mbCBenzjL4zi4e" },
  ],

  navegacion: [
    { etiqueta: "Programas", href: "#programas" },
    { etiqueta: "Ver y escuchar", href: "#archivo" },
    { etiqueta: "Renta de estudio", href: "#estudio" },
    { etiqueta: "Marcas", href: "#marcas" },
  ],
} as const;
