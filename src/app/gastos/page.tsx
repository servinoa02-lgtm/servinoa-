"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Trash2, ArrowLeft, Plus, Receipt, 
  User, Calendar, Search, Activity, 
  Filter, ArrowUpRight
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { ProveedorQuickAdd } from "@/components/ui/ProveedorQuickAdd";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { formatFecha } from "@/lib/dateUtils";
import { FORMAS_PAGO, formatMoney } from "@/lib/constants";
import { formatoService } from "@/services/formatoService";
import { useToast } from "@/context/ToastContext";
import { useDebounce } from "@/hooks/useDebounce";

interface Gasto {
  id: string;
  tipo: string;
  fecha: string;
  descripcion: string;
  importe: number;
  formaPago: string;
  comprobante?: string | null;
  empleado?: string | null;
  desde?: string | null;
  hasta?: string | null;
  usuario: { nombre: string };
  caja?: { nombre: string } | null;
  proveedor?: { nombre: string } | null;
}

interface Proveedor { id: string; nombre: string; empresa?: string | null; domicilio?: string | null; telefono?: string | null; rubro?: string | null; }
interface Caja { id: string; nombre: string; }

const FORMAS_PAGO_GASTO = [...FORMAS_PAGO] as const;

const TIPOS_GASTO = [
  { value: "GASTO_VARIOS", label: "Gastos Varios" },
  { value: "SUELDO", label: "Sueldo / Personal" },
  { value: "INSUMOS", label: "Compra de Insumos" },
  { value: "MANTENIMIENTO", label: "Mantenimiento Taller" },
  { value: "IMPUESTOS", label: "Impuestos y Servicios" },
  { value: "LOGISTICA", label: "Logística y Envíos" },
  { value: "EQUIPAMIENTO", label: "Equipamiento" },
];

export default function GastosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Form
  const [tipo, setTipo] = useState<string>("GASTO_VARIOS");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState<string>(FORMAS_PAGO[0]);
  const [cajaId, setCajaId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [empleado, setEmpleado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    setLoading(true);
    fetch(`/api/gastos?page=${page}&limit=15&search=${debouncedSearch}`)
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar gastos");
        return r.json();
      })
      .then((res) => { 
        setGastos(res.data);
        setTotal(res.total);
        setTotalMonth(res.totalMonth);
        setTotalPages(res.totalPages);
        setLoading(false); 
      })
      .catch((e) => {
        setLoading(false);
        showToast(e.message || "Error al cargar gastos", "error");
      });
  };

  useEffect(() => { cargar(); }, [page, debouncedSearch]);

  useEffect(() => {
    fetch("/api/cajas").then((r) => r.json()).then((d) => { setCajas(d); if (d.length > 0) setCajaId(d[0].id); });
    fetch("/api/proveedores").then((r) => r.json()).then(setProveedores);
    fetch("/api/usuarios").then((r) => r.json()).then(setUsuarios);
  }, []);

  const eliminarGasto = async (id: string) => {
    setEliminando(true);
    try {
      const res = await fetch(`/api/gastos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar gasto");
      }
      showToast("Gasto eliminado correctamente", "success");
      cargar();
    } catch (e: any) {
      showToast(e.message || "Error al eliminar gasto", "error");
    } finally {
      setEliminando(false);
      setConfirmDelete(null);
    }
  };

  const guardar = async () => {
    if (!importe || !cajaId) return;
    if (tipo !== "SUELDO" && !descripcion) return;
    if (tipo === "SUELDO" && !empleado) return;
    setGuardando(true);

    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          descripcion: tipo === "SUELDO" ? `SUELDO ${empleado.toUpperCase()}` : formatoService.capitalizarPrimeraLetra(descripcion),
          importe,
          formaPago,
          cajaId,
          usuarioId: (session?.user as { id?: string })?.id,
          proveedorId: proveedorId || null,
          comprobante: formatoService.capitalizarPalabras(comprobante) || null,
          empleado: tipo === "SUELDO" ? empleado.toUpperCase() : null,
          desde: desde || null,
          hasta: hasta || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al registrar gasto");
      }

      setMostrarForm(false);
      setImporte(""); setDescripcion(""); setComprobante(""); setEmpleado(""); setDesde(""); setHasta(""); setProveedorId("");
      showToast("Gasto registrado correctamente", "success");
      cargar();
    } catch (e: any) {
      showToast(e.message || "Error al registrar gasto", "error");
    } finally {
      setGuardando(false);
    }};

  // Eliminado totalDelMes local ya que se calcula en el servidor para considerar todos los registros

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando gastos...</div>
    </div>
  );

  const filteredGastos = gastos;

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
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tesorería</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Control de Gastos</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
              <div className="hidden md:block bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-0.5">Total del Mes</p>
                <p className="text-lg font-bold tabular-nums text-red-700">
                   ${formatMoney(totalMonth)}
                </p>
              </div>
             <button
              onClick={() => setMostrarForm(true)}
              className="bg-red-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-1.5 md:gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Registrar</span> Gasto
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
           <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por descripción, empleado o proveedor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all"
              />
           </div>
           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 italic">
              {total} gastos en total
           </div>
        </div>

        <div className="space-y-4">
          {filteredGastos.map((g, idx) => (
            <div 
              key={g.id} 
              className="group bg-white p-4 md:p-6 rounded-2xl border border-gray-200 hover:shadow-md transition-all flex items-start md:items-center gap-4 md:gap-6"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <Receipt size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase leading-tight">
                      {g.descripcion}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                       <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {formatFecha(g.fecha)}
                       </span>
                       <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${g.tipo === "SUELDO" ? "border-gray-900 text-gray-900" : "border-red-100 text-red-600 bg-red-50"}`}>
                          {TIPOS_GASTO.find(t => t.value === g.tipo)?.label || "Gasto"}
                       </span>
                       {g.proveedor && <span className="text-[10px] font-bold text-gray-400 uppercase">Prov: {g.proveedor.nombre}</span>}
                       {g.caja && <span className="text-[10px] font-bold text-emerald-600 uppercase italic">Caja: {g.caja.nombre}</span>}
                    </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-xl font-bold tabular-nums text-red-600">
                        ${formatMoney(g.importe)}
                     </p>
                     <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                        {g.usuario?.nombre}
                     </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                   <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest tabular-nums italic">
                      ID: {g.id.substring(0,8).toUpperCase()}
                   </div>
                   <button
                      onClick={() => setConfirmDelete(g.id)}
                      className="p-1 px-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                </div>
              </div>
            </div>
          ))}
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

      <Drawer 
        isOpen={mostrarForm} 
        onClose={() => setMostrarForm(false)} 
        title="Registrar Egreso"
      >
        <div className="p-1 space-y-6">
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Categoría de Egreso</label>
             <select 
               value={tipo} onChange={e => setTipo(e.target.value)}
               className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none cursor-pointer uppercase appearance-none"
             >
                {TIPOS_GASTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
             </select>
          </div>

          <div className="space-y-6">
            {tipo !== "SUELDO" ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Proveedor (Opcional)</label>
                  <ProveedorQuickAdd
                    value={proveedorId}
                    proveedores={proveedores}
                    onChange={setProveedorId}
                    onCreated={(p) => setProveedores(prev => [...prev, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Descripción *</label>
                  <textarea value={descripcion} onChange={(e) => setDescripcion(formatoService.capitalizarPrimeraLetra(e.target.value))}
                    placeholder="Detalle el motivo del gasto..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-medium outline-none min-h-[80px] resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">N° Comprobante (Opcional)</label>
                  <input type="text" value={comprobante} onChange={(e) => setComprobante(formatoService.capitalizarPalabras(e.target.value))}
                    placeholder="Factura, Recibo, etc..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-medium outline-none" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Operador / Beneficiario *</label>
                  <select value={empleado} onChange={(e) => setEmpleado(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase cursor-pointer appearance-none">
                     <option value="">Seleccione personal...</option>
                     {usuarios.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Desde</label>
                    <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Hasta</label>
                    <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Método Pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                  {FORMAS_PAGO_GASTO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-red-600 uppercase tracking-wider ml-1">Caja Salida *</label>
                <select value={cajaId} onChange={(e) => setCajaId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 text-red-500 border border-transparent rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="p-6 bg-gray-950 rounded-2xl border-b-4 border-red-600 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-red-600 text-center block">Importe a Pagar *</label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-700">$</span>
                <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-white text-3xl font-bold outline-none text-center tabular-nums" />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={guardar}
              disabled={guardando || !importe || !cajaId}
              className="w-full bg-red-600 text-white py-4 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
            >
              {guardando ? "Procesando..." : "Confirmar Egreso"}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Anular Gasto"
        message="¿Estás seguro de eliminar este registro? Esta acción impactará en el balance de la caja seleccionada."
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarGasto(confirmDelete)}
      />

      {/* Toast global ya manejado por ToastProvider */}
    </div>
    </RoleGuard>
  );
}
