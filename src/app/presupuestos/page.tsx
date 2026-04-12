"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Trash2, ArrowLeft, Plus, Search, FileText, ChevronRight } from "lucide-react";
import { useSort } from "@/hooks/useSort";
import { SortHeader } from "@/components/ui/SortHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFecha } from "@/lib/dateUtils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { useDebounce } from "@/hooks/useDebounce";
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

const cobroColors: Record<string, string> = {
  PENDIENTE: "text-gray-400",
  APROBACION_PENDIENTE: "text-orange-600",
  COBRO_PENDIENTE: "text-red-600",
  COBRADO: "text-emerald-600",
  PARCIAL: "text-blue-600",
};

const cobroLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBACION_PENDIENTE: "Aprobación pendiente",
  COBRO_PENDIENTE: "Cobro pendiente",
  COBRADO: "Cobrado",
  PARCIAL: "Pago parcial",
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
  const [debouncedSearch] = useDebounce(busqueda, 500);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [globalCobrado, setGlobalCobrado] = useState(0);
  const [globalSaldo, setGlobalSaldo] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; numero: number; fecha: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    setLoading(true);
    fetch(`/api/presupuestos?page=${page}&limit=20&search=${debouncedSearch}`)
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar presupuestos");
        return r.json();
      })
      .then((res) => { 
        setPresupuestos(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setGlobalTotal(res.globalTotal || 0);
        setGlobalCobrado(res.globalCobrado || 0);
        setGlobalSaldo(res.globalSaldo || 0);
        setLoading(false); 
      })
      .catch((e) => {
        setLoading(false);
        showToast(e.message, "error");
      });
  };

  useEffect(() => { cargar(); }, [page, debouncedSearch]);
  useAutoRefresh(cargar);

  const eliminarPresupuesto = async (id: string) => {
    setEliminando(true);
    const res = await fetch(`/api/presupuestos/${id}`, { method: "DELETE" });
    const data = await res.json();
    setEliminando(false);
    if (!res.ok) {
      showToast(data.error || "Error al eliminar presupuesto", "error");
      return;
    }
    setConfirmDelete(null);
    setPresupuestos((prev) => prev.filter((p) => p.id !== id));
    showToast("Presupuesto eliminado correctamente", "success");
  };

  const filtrados = presupuestos.filter((p) => {
    // El filtrado por texto ya viene del servidor, 
    // aquí solo aplicamos filtros rápidos opcionales si hicieran falta
    const coincideEstado = !filtroEstado || p.estado === filtroEstado;
    return coincideEstado;
  });

  const { sorted: ordenados, sortKey, sortDirection, toggle } = useSort(filtrados, {
    numero: (p) => p.numero,
    cliente: (p) => p.cliente?.empresa?.nombre || p.cliente?.nombre || "",
    vinculo: (p) => p.orden?.numero ?? -1,
    total: (p) => p.total,
    saldo: (p) => p.saldo,
    estado: (p) => p.estado,
  });

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando presupuestos...</div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN", "JEFE", "ADMINISTRACION"]}>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ventas</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Presupuestos</h1>
            </div>
          </div>
          <button
            onClick={() => router.push("/presupuestos/nuevo")}
            className="bg-red-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-1.5 md:gap-2"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nueva</span> Cotización
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full space-y-6 md:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Buscador */}
           <div className="sm:col-span-2 relative bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por n°, cliente o factura..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all"
              />
           </div>

           {/* Estadísticas Rápidas del Filtro */}
           <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Total Cotizado</p>
              <p className="text-lg font-bold text-gray-900 text-center">${globalTotal.toLocaleString("es-AR")}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-600">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1 text-center">Saldo en Calle</p>
              <p className="text-xl font-bold text-red-700 text-center">${globalSaldo.toLocaleString("es-AR")}</p>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
           <div className="flex gap-4 w-full md:w-auto flex-1">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="flex-1 md:w-48 px-4 py-2.5 bg-gray-900 text-white border-none rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="PRESUPUESTADO">Presupuestado</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
               <div className="hidden sm:flex items-center px-4 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {total} presupuestos cargados
              </div>
           </div>
        </div>

        {/* ─── Desktop: Tabla ─── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <SortHeader label="N° Documento" sortKey="numero" currentKey={sortKey} direction={sortDirection} onToggle={toggle} />
                  <SortHeader label="Cliente / Empresa" sortKey="cliente" currentKey={sortKey} direction={sortDirection} onToggle={toggle} />
                  <SortHeader label="Vínculo OT" sortKey="vinculo" currentKey={sortKey} direction={sortDirection} onToggle={toggle} />
                  <SortHeader label="Total" sortKey="total" currentKey={sortKey} direction={sortDirection} onToggle={toggle} align="right" />
                  <SortHeader label="Saldo" sortKey="saldo" currentKey={sortKey} direction={sortDirection} onToggle={toggle} align="right" />
                  <SortHeader label="Estado" sortKey="estado" currentKey={sortKey} direction={sortDirection} onToggle={toggle} align="center" />
                  <th className="text-right px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
              {ordenados.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 group transition-all cursor-pointer"
                    onClick={() => router.push(`/presupuestos/${p.id}`)}
                  >
                    <td className="px-6 py-5">
                      <p className="font-bold text-red-600 text-lg tracking-tight italic">
                        {formatNumero(p.numero, p.fecha)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold">{formatFecha(p.fecha)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 uppercase text-sm leading-tight">
                        {p.cliente?.empresa?.nombre || "Particular"}
                      </p>
                      {p.cliente?.nombre && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Ref: {p.cliente.nombre}</p>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        {p.orden ? `OT #${p.orden.numero}` : "Venta Directa"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-base text-gray-900 tabular-nums">
                        ${p.total?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-5 text-right font-bold text-base tabular-nums ${p.saldo > 0 ? "text-red-700 bg-red-50/30" : "text-emerald-700 bg-emerald-50/30"}`}>
                        ${p.saldo?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge status={p.estado} />
                          <StatusBadge status={p.estadoCobro} className="!text-[8px]" />
                        </div>
                    </td>
                    <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setConfirmDelete({ id: p.id, numero: p.numero, fecha: p.fecha })}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-gray-400 font-medium italic bg-gray-50/20">
                       No se encontraron presupuestos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Paginación ─── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all border border-gray-100"
            >
              Anterior
            </button>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Página <span className="text-gray-900">{page}</span> de <span className="text-gray-900">{totalPages}</span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all border border-gray-100"
            >
              Siguiente
            </button>
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar Presupuesto"
        message={`¿Estás seguro de eliminar el presupuesto ${confirmDelete ? formatNumero(confirmDelete.numero, confirmDelete.fecha) : ""}? Esta acción no se puede deshacer.`}
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarPresupuesto(confirmDelete.id)}
      />

      {/* Toast global ya manejado por ToastProvider */}
    </div>
    </RoleGuard>
  );
}
