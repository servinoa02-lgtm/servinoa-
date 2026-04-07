"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2, ArrowLeft, Plus, Search, FileText, Printer, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

interface Presupuesto {
  id: string;
  numero: number;
  fecha: string;
  estado: string;
  estadoCobro: string;
  facturaNumero: string | null;
  total: number;
  cobrado: number;
  saldo: number;
  cliente: { nombre: string; empresa?: { nombre: string } | null };
  orden: { numero: number; id: string } | null;
}

const estadoColors: Record<string, string> = {
  BORRADOR: "border-gray-200 text-gray-400 bg-white",
  PRESUPUESTADO: "border-blue-600 text-blue-600 bg-blue-50",
  APROBADO: "border-emerald-600 text-emerald-600 bg-emerald-50",
  RECHAZADO: "border-red-600 text-red-600 bg-red-50",
};

const cobroColors: Record<string, string> = {
  PENDIENTE: "text-gray-400",
  APROBACION_PENDIENTE: "text-orange-600",
  COBRO_PENDIENTE: "text-red-600",
  COBRADO: "text-emerald-600",
  PARCIAL: "text-blue-600",
};

const cobroLabel: Record<string, string> = {
  PENDIENTE: "PND",
  APROBACION_PENDIENTE: "VALIDACIÓN",
  COBRO_PENDIENTE: "PAGO PND",
  COBRADO: "LIQUIDADO",
  PARCIAL: "A CUENTA",
};

function formatNumero(numero: number, fecha: string) {
  const year = new Date(fecha).getFullYear();
  return `${year}-${numero.toString().padStart(5, "0")}`;
}

export default function PresupuestosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; numero: number; fecha: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorDelete, setErrorDelete] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/presupuestos")
      .then((r) => r.json())
      .then((data) => {
        setPresupuestos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const eliminarPresupuesto = async (id: string) => {
    setEliminando(true);
    setErrorDelete(null);
    const res = await fetch(`/api/presupuestos/${id}`, { method: "DELETE" });
    const data = await res.json();
    setEliminando(false);
    if (!res.ok) {
      setErrorDelete(data.error || "ERROR AL ELIMINAR REGISTRO");
      return;
    }
    setConfirmDelete(null);
    setPresupuestos((prev) => prev.filter((p) => p.id !== id));
  };

  const filtrados = presupuestos.filter((p) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      p.numero.toString().includes(texto) ||
      p.cliente?.nombre?.toLowerCase().includes(texto) ||
      p.cliente?.empresa?.nombre?.toLowerCase().includes(texto) ||
      (p.facturaNumero || "").toLowerCase().includes(texto);
    const coincideEstado = !filtroEstado || p.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        Sincronizando Libro de Presupuestos...
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
              <div className="flex items-center gap-3 text-gray-400 mb-1">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Administración</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">FLUJO DE CAJA ESTIMADO</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Gestión de Presupuestos</h1>
            </div>
          </div>
          <button
            onClick={() => router.push("/presupuestos/nuevo")}
            className="flex items-center gap-3 bg-red-600 text-white px-10 py-5 rounded-2xl text-xs font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/40 uppercase tracking-[0.2em] active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">NUEVA COTIZACIÓN</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-10 w-full lg:space-y-12">
        
        {/* Barra de Filtros Industrial */}
        <div className="flex flex-col lg:row items-center gap-8 bg-white p-8 rounded-[32px] border-2 border-gray-100 shadow-sm">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" size={24} />
            <input
              type="text"
              placeholder="BUSCAR PPTO, CLIENTE, EMPRESA O FACTURA..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-16 pr-6 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-base text-gray-900 placeholder:text-gray-300 outline-none transition-all shadow-inner font-black uppercase tracking-tight italic"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
            <div className="relative">
                <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full sm:w-72 px-8 py-6 bg-gray-900 text-white border-none rounded-2xl text-xs font-black outline-none hover:bg-black transition-all shadow-xl shadow-gray-900/10 uppercase tracking-widest italic appearance-none cursor-pointer"
                >
                <option value="">TODOS LOS ESTADOS</option>
                <option value="BORRADOR">BORRADOR</option>
                <option value="PRESUPUESTADO">ENVIADO</option>
                <option value="APROBADO">APROBADOS</option>
                <option value="RECHAZADO">RECHAZADOS</option>
                </select>
                <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-red-600 rotate-90 pointer-events-none" />
            </div>
            <div className="flex items-center justify-center text-[10px] font-black text-gray-400 bg-gray-50 px-8 py-4 rounded-2xl border-2 border-dashed border-gray-200 uppercase tracking-[0.3em] whitespace-nowrap">
              {filtrados.length} REGISTROS INDEXADOS
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
                <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-100 text-gray-400 uppercase text-[10px] font-black tracking-[0.3em]">
                    <th className="text-left px-8 py-6">ID Documento</th>
                    <th className="text-left px-8 py-6">Vencimiento</th>
                    <th className="text-left px-8 py-6">Operativa Comercial</th>
                    <th className="text-left px-8 py-6">Vínculo</th>
                    <th className="text-right px-8 py-6">Importe Líquido</th>
                    <th className="text-right px-8 py-6">Saldo</th>
                    <th className="text-center px-8 py-6">Protocolo</th>
                    <th className="text-right px-8 py-6">...</th>
                </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100">
                {filtrados.map((p) => (
                    <tr
                    key={p.id}
                    className="hover:bg-red-50/30 transition-all cursor-pointer group"
                    onClick={() => router.push(`/presupuestos/${p.id}`)}
                    >
                    <td className="px-8 py-8 font-black text-red-600 italic text-xl tracking-tighter">
                        {formatNumero(p.numero, p.fecha)}
                    </td>
                    <td className="px-8 py-8 text-gray-400 font-black font-mono text-xs tabular-nums tracking-widest">
                        {new Date(p.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-8 py-8">
                        <div className="font-black text-gray-900 uppercase text-sm tracking-tight leading-tight group-hover:text-red-700 transition-colors">
                        {p.cliente?.empresa?.nombre || "ENTIDAD PARTICULAR"}
                        </div>
                        {p.cliente?.nombre && (
                        <div className="text-[10px] text-gray-400 uppercase font-black italic mt-1.5 opacity-60">RESPONSABLE: {p.cliente.nombre}</div>
                        )}
                    </td>
                    <td className="px-8 py-8 font-black text-gray-500 italic text-[11px] uppercase tracking-widest font-mono">
                        {p.orden ? `OT #${p.orden.numero}` : "EXTERNO"}
                    </td>
                    <td className="px-8 py-8 text-right font-black text-lg italic tracking-tighter text-gray-900 tabular-nums">
                        ${p.total?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-8 py-8 text-right font-black text-lg italic tracking-tighter tabular-nums ${p.saldo > 0 ? "text-red-700 bg-red-50/50" : "text-emerald-700 bg-emerald-50/50"}`}>
                        ${p.saldo?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-8 text-center space-y-2">
                        <div className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border-2 shadow-sm inline-block ${estadoColors[p.estado] || "border-gray-200 text-gray-400"}`}>
                        {p.estado}
                        </div>
                        <div className={`text-[9px] font-black uppercase tracking-widest block opacity-70 ${cobroColors[p.estadoCobro] || "text-gray-400"}`}>
                        {cobroLabel[p.estadoCobro] || p.estadoCobro}
                        </div>
                    </td>
                    <td className="px-8 py-8 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                        onClick={() => { setErrorDelete(null); setConfirmDelete({ id: p.id, numero: p.numero, fecha: p.fecha }); }}
                        className="p-4 text-gray-200 hover:text-red-600 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-200 hover:shadow-lg active:scale-90"
                        title="ELIMINAR"
                        >
                        <Trash2 size={20} />
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
          
          {filtrados.length === 0 && (
            <div className="px-8 py-32 text-center">
                <div className="flex flex-col items-center gap-6 opacity-20">
                    <FileText size={80} className="text-gray-400" />
                    <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 italic">BASE DE DATOS SIN REGISTROS COMPATIBLES</span>
                </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Protocolo de Eliminación"
        message={`¿CONFIRMA LA ELIMINACIÓN PERMANENTE DEL PRESUPUESTO ${confirmDelete ? formatNumero(confirmDelete.numero, confirmDelete.fecha) : ""}? ESTA ACCIÓN NO TIENE RETORNO.`}
        confirmLabel={eliminando ? "BORRANDO..." : "SÍ, ELIMINAR REGISTRO"}
        onCancel={() => { setConfirmDelete(null); setErrorDelete(null); }}
        onConfirm={() => confirmDelete && eliminarPresupuesto(confirmDelete.id)}
      />

      {errorDelete && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border-2 border-red-600 text-red-600 px-8 py-5 rounded-[24px] shadow-2xl shadow-red-600/20 font-black uppercase tracking-[0.2em] italic flex items-center gap-4 animate-in slide-in-from-bottom duration-500">
           <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
           {errorDelete}
           <button onClick={() => setErrorDelete(null)} className="ml-6 py-2 px-4 hover:bg-red-600/10 rounded-lg transition-all underline text-[10px]">CERRAR</button>
        </div>
      )}
      
      <footer className="max-w-7xl mx-auto w-full px-6 lg:px-10 py-10">
         <div className="border-t-2 border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic leading-relaxed text-center md:text-left">SISTEMA DE GESTIÓN INDUSTRIAL — SERVINOA V3.0<br/>MODULO ADMINISTRATIVO — PROTECCIÓN DE DATOS ACTIVA</p>
         </div>
      </footer>
    </div>
  );
}
