"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Search, Plus, ArrowLeft, Wrench, Calendar, ClipboardList } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { formatFecha } from "@/lib/dateUtils";

interface Orden {
  id: string;
  numero: number;
  fechaRecepcion: string;
  estado: string;
  falla: string;
  cliente: { nombre: string; empresa?: { nombre: string } | null };
  tecnico?: { nombre: string } | null;
  maquina?: { nombre: string } | null;
  marca?: { nombre: string } | null;
  modelo?: { nombre: string } | null;
}

export default function OrdenesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/ordenes")
      .then((r) => r.json())
      .then((data) => { setOrdenes(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);
  useAutoRefresh(cargar);

  const filtradas = ordenes.filter((o) => {
    const texto = busqueda.toLowerCase();
    return (
      o.numero.toString().includes(texto) ||
      o.cliente?.nombre?.toLowerCase().includes(texto) ||
      o.cliente?.empresa?.nombre?.toLowerCase().includes(texto) ||
      o.maquina?.nombre?.toLowerCase().includes(texto) ||
      o.estado.toLowerCase().includes(texto)
    );
  });

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Operaciones</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Órdenes de Trabajo</h1>
            </div>
          </div>
          <button
            onClick={() => router.push("/ordenes/nueva")}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-2"
          >
            <Plus size={18} /> Nueva OT
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
           <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por n°, cliente o equipo..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all"
              />
           </div>
           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 italic">
              {filtradas.length} órdenes encontradas
           </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="text-left px-6 py-4">N° Orden</th>
                  <th className="text-left px-6 py-4">Cliente / Empresa</th>
                  <th className="text-left px-6 py-4">Equipo / Marca</th>
                  <th className="text-left px-6 py-4">Estado</th>
                  <th className="text-right px-6 py-4">Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-gray-50 group transition-all cursor-pointer"
                    onClick={() => router.push(`/ordenes/${o.id}`)}
                  >
                    <td className="px-6 py-5">
                       <span className="font-bold text-red-600 text-lg tracking-tight">#{o.numero}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 uppercase text-sm leading-none mb-1">{o.cliente?.nombre}</p>
                      {o.cliente?.empresa?.nombre && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{o.cliente.empresa.nombre}</p>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-gray-600 font-medium uppercase text-[11px] bg-gray-100/50 px-2.5 py-1 rounded-lg border border-gray-100 inline-block">
                        {[o.maquina?.nombre, o.marca?.nombre, o.modelo?.nombre]
                          .filter(Boolean)
                          .join(" — ") || "Sin especificar"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={o.estado} />
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="flex items-center justify-end gap-2 text-gray-900 font-bold font-mono text-xs">
                          <Calendar size={14} className="text-gray-300" />
                          {formatFecha(o.fechaRecepcion)}
                       </div>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium italic bg-gray-50/20">
                       No se encontraron órdenes con esos criterios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}