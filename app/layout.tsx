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
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
