import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, CheckSquare } from "lucide-react";
import { TareasClient } from "./TareasClient";

export default async function TareasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const usuarios = await prisma.usuario.findMany({ select: { id: true, nombre: true } });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1 lg:mb-0">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Operaciones</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Gestión de Tareas</h1>
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 hidden sm:block">
            <CheckSquare size={32} className="text-red-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-10 w-full">
        <TareasClient usuarios={usuarios} />
      </main>
    </div>
  );
}
