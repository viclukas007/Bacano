import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida mínima para la imagen de Docker: un server.js con lo justo.
  output: "standalone",
  // El driver de Postgres usa net/tls de Node; mejor fuera del bundle.
  serverExternalPackages: ["postgres"],
  // Las acciones del servidor solo reciben formularios de texto; el tope por
  // defecto (1 MB) daba de sobra para campos maliciosos.
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  images: {
    remotePatterns: [
      // Miniaturas de los videos de YouTube.
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
