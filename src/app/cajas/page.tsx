"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Wallet, Repeat, History, Plus } from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { formatMoney } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

interface Caja {
  id: string;
  nombre: string;
  saldo: number;
}

export default function CajasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/cajas")
      .then((r) => r.json())
      .then((data) => { setCajas(data); setLoading(false); })
      .catch(() => { showToast("Error al cargar las cajas", "error"); setLoading(false); });
  }, []);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-gray-500 font-bold animate-pulse uppercase tracking-[0.2em]">Cargando Cajas...</p></div>;
  }

  // Retenciones se muestra pero NO suma al total disponible
  const totalGeneral = cajas
    .filter((c: Caja) => c.nombre.toUpperCase() !== "RETENCIONES")
    .reduce((sum: number, c: Caja) => sum + c.saldo, 0);

  return (
    <RoleGuard allowedRoles={["ADMIN", "JEFE", "ADMINISTRACION"]}>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 lg:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-6">
            <Link href="/finanzas" className="hidden lg:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Finanzas</p>
              <h1 className="text-xl lg:text-3xl xl:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Control de Cajas</h1>
            </div>
          </div>
          <div className="text-right border-l-4 border-emerald-500 pl-3 md:pl-6 bg-emerald-50/50 py-1.5 md:py-2 pr-2 md:pr-4 rounded-r-xl">
            <p className="text-[8px] md:text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-0.5 md:mb-1">Tesorería Total</p>
            <p className={`text-lg md:text-2xl lg:text-3xl font-black tabular-nums ${totalGeneral >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              ${formatMoney(totalGeneral)}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 lg:px-10 py-6 lg:py-10 w-full space-y-6 lg:space-y-10">
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            className="flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-black bg-red-600 text-white shadow-lg shadow-red-600/20 uppercase tracking-widest transition-all"
          >
            <Wallet size={18} /> CAJAS ACTIVAS
          </button>
          <button
            onClick={() => router.push("/cajas/transferencias")}
            className="flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-black bg-white border border-gray-300 text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all uppercase tracking-widest shadow-sm"
          >
            <Repeat size={18} /> TRANSFERENCIAS
          </button>
          <button
            onClick={() => router.push("/cheques")}
            className="flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-black bg-white border border-gray-300 text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-all uppercase tracking-widest shadow-sm"
          >
            <History size={18} /> CARTERA CHEQUES
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {cajas.map((caja) => {
            const esRetencion = caja.nombre.toUpperCase() === "RETENCIONES";
            return (
              <button
                key={caja.id}
                onClick={() => router.push(`/cajas/${caja.id}`)}
                className="group relative bg-white border-2 border-transparent hover:border-red-600 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl transition-all bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-gray-100 rounded-xl text-gray-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors shadow-inner">
                    <Wallet size={24} />
                  </div>
                  {esRetencion
                    ? <span className="text-[8px] font-black text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded uppercase tracking-wider">excluida</span>
                    : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/20" />
                  }
                </div>
                <p className="text-sm font-black text-gray-500 mb-2 uppercase tracking-widest group-hover:text-gray-900 transition-colors">CAJA :: {caja.nombre}</p>
                <p className={`text-2xl lg:text-3xl font-black tabular-nums tracking-tighter group-hover:scale-105 transition-transform origin-left ${esRetencion ? "text-gray-400" : caja.saldo >= 0 ? "text-gray-900" : "text-red-700"}`}>
                  ${formatMoney(caja.saldo)}
                </p>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{esRetencion ? "VER RETENCIONES" : "GESTIONAR FONDOS"}</span>
                  <Repeat size={14} />
                </div>
              </button>
            );
          })}

        </div>
      </main>
    </div>
    </RoleGuard>
  );
}
