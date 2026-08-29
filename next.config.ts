import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del workspace a esta carpeta. Si el proyecto queda anidado
  // dentro de otro (un monorepo, o una copia de trabajo), sin esto Next sube
  // buscando package-lock.json, toma la carpeta de arriba como raíz y arrastra
  // al build archivos que no son de este proyecto.
  turbopack: { root: path.resolve(process.cwd()) },

  // Cabeceras de seguridad.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
