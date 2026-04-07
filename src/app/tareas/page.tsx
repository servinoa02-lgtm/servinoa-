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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-1.5 rounded-md">
                <CheckSquare className="text-indigo-600 w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Gestión de Tareas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <TareasClient usuarios={usuarios} />
      </main>
    </div>
  );
}
