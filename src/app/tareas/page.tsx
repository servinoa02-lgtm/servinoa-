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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Operaciones</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Gestión de Tareas</h1>
            </div>
          </div>
          <div className="p-2 bg-red-50 rounded-xl border border-red-100 hidden sm:block">
            <CheckSquare size={24} className="text-red-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full">
        <TareasClient usuarios={usuarios} />
      </main>
    </div>
  );
}
