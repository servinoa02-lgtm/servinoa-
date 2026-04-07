"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Plus, ArrowLeft, Filter, Table as TableIcon, Wrench, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

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

  useEffect(() => {
    fetch("/api/ordenes")
      .then((r) => r.json())
      .then((data) => {
        setOrdenes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        Sincronizando Órdenes de Trabajo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      
      {/* Header Industrial */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1 lg:mb-0">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Operaciones</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">TALLER INDUSTRIAL</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Órdenes de Trabajo</h1>
            </div>
          </div>
          <button
            onClick={() => router.push("/ordenes/nueva")}
            className="hidden lg:flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-xl text-sm font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 uppercase tracking-widest"
          >
            <Plus size={20} /> NUEVA OT
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-10 w-full space-y-8">
        
        {/* Filtros Buscador V3 */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100">
           <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="BUSCAR N° OT, CLIENTE, EQUIPO..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-red-600 transition-all font-bold placeholder:font-normal placeholder:lowercase placeholder:tracking-normal"
              />
           </div>
           <button
             onClick={() => router.push("/ordenes/nueva")}
             className="lg:hidden w-full sm:w-auto bg-red-600 text-white px-8 py-4 rounded-xl text-sm font-black hover:bg-red-700 shadow-xl shadow-red-600/20 uppercase tracking-widest"
           >
             + NUEVA OT
           </button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                <th className="text-left px-6 py-5">IDENTIFICADOR</th>
                <th className="text-left px-6 py-5">TITULAR / EMPRESA</th>
                <th className="text-left px-6 py-5">UNIDAD — MODELO</th>
                <th className="text-left px-6 py-5 whitespace-nowrap">ESTADO OPERATIVO</th>
                <th className="text-right px-6 py-5">RECEPCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-gray-50 group transition-all cursor-pointer"
                  onClick={() => router.push(`/ordenes/${o.id}`)}
                >
                  <td className="px-6 py-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                          <Wrench size={18} />
                       </div>
                       <span className="font-black text-red-600 italic text-xl tracking-tighter">
                         #{o.numero}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="font-black text-gray-900 uppercase italic text-base tracking-tighter mb-1">
                      {o.cliente?.nombre}
                    </div>
                    {o.cliente?.empresa?.nombre && (
                      <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{o.cliente.empresa.nombre}</div>
                    )}
                  </td>
                  <td className="px-6 py-8">
                    <div className="text-gray-600 font-bold uppercase text-xs tracking-tight bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block">
                      {[o.maquina?.nombre, o.marca?.nombre, o.modelo?.nombre]
                        .filter(Boolean)
                        .join(" — ") || "DETALLE TÉCNICO SIN ESPECIFICAR"}
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <StatusBadge status={o.estado} />
                  </td>
                  <td className="px-6 py-8 text-right">
                    <div className="flex flex-col items-end">
                       <span className="text-gray-400 font-black text-xs mb-1 uppercase tracking-widest">FECHA ALTA</span>
                       <div className="flex items-center gap-2 text-gray-900 font-bold font-mono text-sm tabular-nums">
                          <Calendar size={14} className="text-gray-300" />
                          {new Date(o.fechaRecepcion).toLocaleDateString("es-AR")}
                       </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-32 text-center bg-gray-50/30">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                         <TableIcon size={64} className="text-gray-400" />
                         <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 italic">No se registran órdenes coincidentes</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}