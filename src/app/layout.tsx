import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "ServiNOA - Sistema de Gestión",
  description: "Sistema de gestión integral - ServiNOA Soluciones de Ingeniería",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}