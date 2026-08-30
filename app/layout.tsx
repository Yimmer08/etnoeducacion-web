import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { FUNDACION, SITIO_URL } from "@/lib/fundacion/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] });

const TITULO = `${FUNDACION.lema} — ${FUNDACION.nombre}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITIO_URL),
  title: { default: TITULO, template: `%s — ${FUNDACION.nombreCorto}` },
  description: FUNDACION.descripcion,
  openGraph: {
    type: "website",
    siteName: FUNDACION.nombre,
    title: TITULO,
    description: FUNDACION.descripcion,
    url: SITIO_URL,
    locale: "es_CO",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${serif.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-crema text-carbon antialiased">
        <a href="#contenido" className="salto-contenido">
          Saltar al contenido
        </a>
        <Navbar />
        {/* `flex flex-col` para que una página pueda estirarse hasta el pie con
            `flex-1`. Sin eso, un `min-h-full` no resuelve —un porcentaje
            necesita un padre de altura definida, y la de `main` es automática—
            y una página corta con fondo propio deja una franja del color del
            layout entre su final y el pie. */}
        <main id="contenido" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
