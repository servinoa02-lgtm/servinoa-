"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import Link from "next/link";
import { 
  Trash2, ArrowLeft, Plus, Search, Receipt, 
  User, Wallet, Briefcase, FileText, CheckCircle2,
  Activity, Calendar, ArrowUpRight, TrendingUp,
  AlertCircle, RefreshCcw
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";

interface Cobranza {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string | null;
  importe: number;
  formaPago: string;
  montoPresupuesto?: number | null;
  saldo?: number | null;
  cliente?: { nombre: string; empresa?: { nombre: string } | null } | null;
  presupuesto?: { numero: number; orden?: { numero: number } | null } | null;
  caja?: { nombre: string } | null;
}

interface Cliente { id: string; nombre: string; empresa?: { nombre: string } | null; }
interface Presupuesto { id: string; numero: number; total: number; cobrado: number; saldo: number; fecha: string; clienteId?: string; estado?: string; }
interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "MERCADO PAGO", "OTRO"];

function CobranzasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pptoIdParam = searchParams.get("presupuestoId");

  const [cobranzas, setCobranzas] = useState<Cobranza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Form state
  const [tipo, setTipo] = useState<"PRESUPUESTO" | "COBRANZA_VARIA">("PRESUPUESTO");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoId, setPresupuestoId] = useState(pptoIdParam || "");
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaId, setCajaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  
  // Datos Cheque
  const [chequeNumero, setChequeNumero] = useState("");
  const [chequeBanco, setChequeBanco] = useState("");
  const [chequeFechaEmision, setChequeFechaEmision] = useState("");
  const [chequeFechaCobro, setChequeFechaCobro] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [pptoCargando, setPptoCargando] = useState(false);
  const [pptoInfo, setPptoInfo] = useState<Presupuesto | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSafe = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Fetch error:", e);
      throw e;
    }
  };

  const cargarCobranzas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSafe("/api/cobranzas");
      setCobranzas(data);
    } catch (e) {
      setError("No se pudieron cargar las cobranzas. Verifique su conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [clientesData, cajasData] = await Promise.all([
        fetchSafe("/api/clientes"),
        fetchSafe("/api/cajas")
      ]);
      setClientes(clientesData);
      setCajas(cajasData);
      if (cajasData.length > 0 && !cajaId) setCajaId(cajasData[0].id);
    } catch (e) {
      console.error("Error cargando catálogos", e);
    }
  }, [cajaId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      cargarCobranzas();
      cargarCatalogos();
    }
  }, [status, router, cargarCobranzas, cargarCatalogos]);

  useEffect(() => {
    if (status === "authenticated" && pptoIdParam) {
      setMostrarForm(true);
      setTipo("PRESUPUESTO");
      setPptoInfo(null);
      fetchSafe(`/api/presupuestos/${pptoIdParam}`)
        .then((d) => {
          setPptoInfo(d);
          setPresupuestoId(pptoIdParam);
          setClienteId(d.clienteId || "");
          setImporte(d.saldo?.toString() || "");
        })
        .catch(e => console.error("Error cargando presupuesto por param", e));
    }
  }, [pptoIdParam, status]);

  useEffect(() => {
    if (status === "authenticated" && clienteId && tipo === "PRESUPUESTO") {
      setPptoCargando(true);
      fetchSafe("/api/presupuestos")
        .then((d: Presupuesto[]) => {
          const del_cliente = d.filter(p => p.clienteId === clienteId && p.estado === "APROBADO" && p.saldo > 0);
          setPresupuestos(del_cliente);
        })
        .catch(e => console.error("Error cargando presupuestos del cliente", e))
        .finally(() => setPptoCargando(false));
    }
  }, [clienteId, tipo, status]);

  const eliminarCobranza = async (id: string) => {
    try {
      setEliminando(true);
      await fetchSafe(`/api/cobranzas/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await cargarCobranzas();
    } catch (e) {
      alert("No se pudo eliminar la cobranza.");
    } finally {
      setEliminando(false);
    }
  };

  const guardar = async () => {
    if (!cajaId || !importe || !session?.user?.id) return;
    if (tipo === "PRESUPUESTO" && !presupuestoId) return;
    
    try {
      setGuardando(true);
      await fetchSafe("/api/cobranzas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          clienteId: clienteId || null,
          presupuestoId: tipo === "PRESUPUESTO" ? presupuestoId : null,
          descripcion: (descripcion || "Cobranza operativa").toUpperCase(),
          importe,
          formaPago,
          cajaId,
          usuarioId: session.user.id,
          ...(formaPago === "CHEQUE" && { 
              chequeNumero: chequeNumero.toUpperCase(), 
              chequeBanco: chequeBanco.toUpperCase(), 
              chequeFechaEmision, 
              chequeFechaCobro 
          })
        }),
      });

      setMostrarForm(false);
      setImporte(""); setDescripcion(""); setPresupuestoId(""); setClienteId("");
      setChequeNumero(""); setChequeBanco(""); setChequeFechaEmision(""); setChequeFechaCobro("");
      await cargarCobranzas();
    } catch (e) {
      alert("Error al registrar la cobranza.");
    } finally {
      setGuardando(false);
    }
  };

  if (status === "loading" || (loading && !error)) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-emerald-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse uppercase tracking-widest">Sincronizando flujos de caja...</div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center p-40 text-center space-y-6">
      <AlertCircle size={48} className="text-red-500" />
      <div>
        <h2 className="text-lg font-bold text-gray-900 uppercase">Error de Conexión</h2>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
      <button 
        onClick={() => cargarCobranzas()}
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all"
      >
        <RefreshCcw size={16} /> Reintentar
      </button>
    </div>
  );

  const filteredCobranzas = cobranzas.filter(c => 
    (c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.cliente?.empresa?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.presupuesto?.numero.toString().includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tesorería</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Cobros</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end px-4 py-2 border-r border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Recaudado</p>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">
                  ${cobranzas.reduce((sum, c) => sum + c.importe, 0).toLocaleString("es-AR")}
                </p>
             </div>
             <button
              onClick={() => { setMostrarForm(true); setTipo("PRESUPUESTO"); }}
              className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md flex items-center gap-2 uppercase tracking-wider"
            >
              <Plus size={18} /> Nuevo Cobro
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full space-y-6">
        <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center">
          <Search className="ml-4 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CLIENTE, EMPRESA O NRO PPTO..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-sm font-bold uppercase outline-none placeholder:text-gray-300"
          />
          <div className="px-4 py-1.5 bg-gray-50 rounded-xl text-[9px] font-bold text-gray-400 uppercase mr-2 border border-gray-100 italic">
            {filteredCobranzas.length} reg.
          </div>
        </div>

        <div className="space-y-3">
          {filteredCobranzas.map((c) => (
            <div 
              key={c.id} 
              className="group bg-white p-5 rounded-2xl border border-gray-200 hover:border-emerald-200 transition-all flex items-center gap-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Receipt size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 uppercase leading-none truncate">
                      {c.cliente?.empresa?.nombre ? c.cliente.empresa.nombre : c.cliente?.nombre || "Cobro vario"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {new Date(c.fecha).toLocaleDateString("es-AR")}
                       </span>
                       <span className="text-[9px] font-bold text-gray-500 uppercase px-2 py-0.5 bg-gray-100 rounded border border-gray-200 italic">
                          {c.presupuesto ? `Ppto #${c.presupuesto.numero}` : c.descripcion}
                       </span>
                       {c.caja && <span className="text-[9px] font-bold text-emerald-600 uppercase">Caja: {c.caja.nombre}</span>}
                    </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-base font-bold tabular-nums text-emerald-600">
                        +${c.importe.toLocaleString("es-AR")}
                     </p>
                     <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{c.formaPago}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setConfirmDelete(c.id)}
                className="p-2 text-gray-200 hover:text-red-600 transition-colors"
                title="Anular cobra"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {filteredCobranzas.length === 0 && (
            <div className="py-20 text-center text-gray-300 uppercase font-bold text-[10px] tracking-widest italic bg-white rounded-3xl border border-dashed border-gray-200">
               No hay registros que coincidan
            </div>
          )}
        </div>
      </main>

      <Drawer 
        isOpen={mostrarForm} 
        onClose={() => setMostrarForm(false)} 
        title="Registrar Cobro"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              {(["PRESUPUESTO", "COBRANZA_VARIA"] as const).map((t) => (
                <button 
                  key={t} 
                  onClick={() => { setTipo(t); setPptoInfo(null); setPresupuestoId(""); }}
                  className={`py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight ${tipo === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                  {t === "PRESUPUESTO" ? "Presupuesto" : "Varios"}
                </button>
              ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
              <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setPresupuestoId(""); setPptoInfo(null); }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none uppercase cursor-pointer focus:border-emerald-600 transition-all">
                <option value="">Seleccionar...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}`.toUpperCase() : c.nombre.toUpperCase()}</option>)}
              </select>
            </div>

            {tipo === "PRESUPUESTO" ? (
              <div className="space-y-4">
                {clienteId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Vincular a</label>
                    {pptoCargando ? <div className="text-[10px] font-bold text-gray-300 animate-pulse uppercase ml-1">Cargando pendientes...</div> : (
                      <select value={presupuestoId} onChange={(e) => {
                        setPresupuestoId(e.target.value);
                        const p = presupuestos.find((x) => x.id === e.target.value);
                        setPptoInfo(p || null);
                        if (p) setImporte(p.saldo.toString());
                      }}
                        className="w-full px-4 py-3 bg-gray-900 text-emerald-400 border-none rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="">Pendientes...</option>
                        {presupuestos.map((p) => <option key={p.id} value={p.id}>Ppto #{p.numero} — Saldo: ${p.saldo.toLocaleString("es-AR")}</option>)}
                      </select>
                    )}
                  </div>
                )}

                {pptoInfo && (
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between text-[10px] font-bold uppercase">
                     <div>
                        <span className="text-gray-400 block mb-0.5">Total</span>
                        <span className="text-gray-900">${pptoInfo.total.toLocaleString("es-AR")}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-emerald-600 block mb-0.5">Ya cobrado</span>
                        <span className="text-emerald-700">${pptoInfo.cobrado.toLocaleString("es-AR")}</span>
                     </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Observación</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="MOTIVO DEL INGRESO..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none uppercase italic" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Medio</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer">
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Caja</label>
                <select value={cajaId} onChange={(e) => setCajaId(e.target.value)}
                  className="w-full px-4 py-3 bg-emerald-600 text-white border-none rounded-xl text-xs font-bold outline-none cursor-pointer">
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {formaPago === "CHEQUE" && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
                 <p className="text-[9px] font-bold text-gray-400 uppercase text-center border-b border-gray-200 pb-2">Información del Título</p>
                 <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="NRO CHEQUE" value={chequeNumero} onChange={e => setChequeNumero(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none uppercase placeholder:text-gray-300"/>
                    <input type="text" placeholder="BANCO EMISOR" value={chequeBanco} onChange={e => setChequeBanco(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none uppercase placeholder:text-gray-300"/>
                    <div className="space-y-1">
                       <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Emisión</label>
                       <input type="date" value={chequeFechaEmision} onChange={e => setChequeFechaEmision(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 font-bold text-[10px] outline-none"/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Cobro</label>
                       <input type="date" value={chequeFechaCobro} onChange={e => setChequeFechaCobro(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 font-bold text-[10px] outline-none"/>
                    </div>
                 </div>
              </div>
            )}

            <div className="p-6 bg-gray-900 rounded-2xl space-y-2 border-b-4 border-emerald-600">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 text-center block mb-2">Importe Final</label>
              <div className="relative flex items-center justify-center">
                <span className="text-xl font-bold text-emerald-600 mr-2">$</span>
                <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-white text-4xl font-bold outline-none text-center tabular-nums" />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={guardar}
              disabled={guardando || !importe || !cajaId || (tipo === "PRESUPUESTO" ? !presupuestoId : !descripcion)}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  PROCESANDO...
                </>
              ) : "CONFIRMAR INGRESO"}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Anular Cobranza"
        message="¿Está seguro de eliminar este ingreso? Esta acción impactará en el balance de la caja seleccionada."
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarCobranza(confirmDelete)}
      />
    </div>
  );
}

export default function CobranzasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-emerald-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse uppercase tracking-[0.2em]">Cargando tesorería...</div>
      </div>
    }>
      <CobranzasContent />
    </Suspense>
  );
}
