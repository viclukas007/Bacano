import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida mínima para la imagen de Docker: un server.js con lo justo.
  output: "standalone",
  // El driver de Postgres usa net/tls de Node; mejor fuera del bundle.
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [
      // Miniaturas de los videos de YouTube.
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
