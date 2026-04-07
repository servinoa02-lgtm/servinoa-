"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Plus, ArrowLeft, Filter, Table as TableIcon } from "lucide-react";
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
      <div className="flex-1 flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-white transition-colors"><ArrowLeft size={16} /></Link>
            <span className="text-xs font-bold uppercase tracking-widest">Operaciones</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Órdenes de Trabajo</h1>
        </div>
        <button
          onClick={() => router.push("/ordenes/nueva")}
          className="bg-brand-primary text-white px-6 py-2.5 rounded-2xl text-sm font-black hover:bg-brand-primary/80 transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
        >
          <Plus size={18} /> NUEVA OT
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por N° OT, cliente, equipo, estado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all"
          />
        </div>
        <button className="px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center gap-2 text-sm font-bold">
          <Filter size={18} /> Filtros
        </button>
      </div>

      <Card 
        icon={<TableIcon size={18} />} 
        title="Directorio de Órdenes" 
        subtitle={`${filtradas.length} órdenes registradas`}
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                <th className="text-left px-6 py-4">N° OT</th>
                <th className="text-left px-6 py-4">Cliente</th>
                <th className="text-left px-6 py-4">Equipo / Marca / Modelo</th>
                <th className="text-left px-6 py-4">Estado</th>
                <th className="text-right px-6 py-4">Fecha Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtradas.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  onClick={() => router.push(`/ordenes/${o.id}`)}
                >
                  <td className="px-6 py-4 font-black text-brand-primary group-hover:underline">
                    #{o.numero}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200 truncate max-w-[200px]">
                      {o.cliente?.nombre}
                    </div>
                    {o.cliente?.empresa?.nombre && (
                      <div className="text-[10px] text-slate-500 uppercase font-black">{o.cliente.empresa.nombre}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300 font-medium truncate max-w-[250px]">
                      {[o.maquina?.nombre, o.marca?.nombre, o.modelo?.nombre]
                        .filter(Boolean)
                        .join(" — ") || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.estado} />
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-bold font-mono text-xs">
                    {new Date(o.fechaRecepcion).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron órdenes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}