"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { 
  Trash2, ArrowLeft, Plus, Search, Receipt, 
  User, Wallet, Briefcase, FileText, CheckCircle2,
  Activity, Calendar, ArrowUpRight, TrendingUp
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
interface Presupuesto { id: string; numero: number; total: number; cobrado: number; saldo: number; fecha: string; }
interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "MERCADO PAGO", "OTRO"];

function CobranzasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pptoIdParam = searchParams.get("presupuestoId");

  const [cobranzas, setCobranzas] = useState<Cobranza[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/cobranzas").then((r) => r.json()).then((d) => { setCobranzas(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
    fetch("/api/cajas").then((r) => r.json()).then((d) => {
      setCajas(d);
      if (d.length > 0) setCajaId(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (pptoIdParam) {
      setMostrarForm(true);
      setTipo("PRESUPUESTO");
      setPptoInfo(null);
      fetch(`/api/presupuestos/${pptoIdParam}`)
        .then((r) => r.json())
        .then((d) => {
          setPptoInfo(d);
          setPresupuestoId(pptoIdParam);
          setClienteId(d.clienteId || "");
          setImporte(d.saldo?.toString() || "");
        });
    }
  }, [pptoIdParam]);

  useEffect(() => {
    if (clienteId && tipo === "PRESUPUESTO") {
      setPptoCargando(true);
      fetch("/api/presupuestos")
        .then((r) => r.json())
        .then((d) => {
          const del_cliente = d.filter((p: Presupuesto & { clienteId?: string; estado?: string }) => p.clienteId === clienteId && p.estado === "APROBADO" && p.saldo > 0);
          setPresupuestos(del_cliente);
          setPptoCargando(false);
        })
        .catch(() => setPptoCargando(false));
    }
  }, [clienteId, tipo]);

  const eliminarCobranza = async (id: string) => {
    setEliminando(true);
    await fetch(`/api/cobranzas/${id}`, { method: "DELETE" });
    setEliminando(false);
    setConfirmDelete(null);
    cargar();
  };

  const guardar = async () => {
    if (!cajaId || !importe) return;
    if (tipo === "PRESUPUESTO" && !presupuestoId) return;
    setGuardando(true);

    await fetch("/api/cobranzas", {
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
        usuarioId: (session?.user as { id?: string })?.id,
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
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-emerald-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando cobranzas...</div>
    </div>
  );

  const filteredCobranzas = cobranzas.filter(c => 
    (c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.cliente?.empresa?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.presupuesto?.numero.toString().includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Finanzas</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Cobros</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col items-end bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Total Cobrado</p>
                <div className="flex items-center gap-2 text-emerald-700">
                   <TrendingUp size={14} />
                   <p className="text-lg font-bold tabular-nums">
                     ${cobranzas.reduce((sum, c) => sum + c.importe, 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                   </p>
                </div>
             </div>
             <button
              onClick={() => { setMostrarForm(true); setTipo("PRESUPUESTO"); }}
              className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-2"
            >
              <Plus size={18} /> Nuevo Cobro
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
           <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar cliente, empresa o n° ppto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all"
              />
           </div>
           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 italic">
              {filteredCobranzas.length} cobros verificados
           </div>
        </div>

        <div className="space-y-4">
          {filteredCobranzas.map((c, idx) => (
            <div 
              key={c.id} 
              className="group bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-md transition-all flex items-center gap-6"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Receipt size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors uppercase leading-tight">
                      {c.cliente?.empresa?.nombre ? c.cliente.empresa.nombre : c.cliente?.nombre || "Cobro vario"}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                       <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {new Date(c.fecha).toLocaleDateString("es-AR")}
                       </span>
                       <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-gray-100 text-gray-500 bg-white">
                          <FileText size={10} />
                          {c.presupuesto
                            ? `Ppto #${c.presupuesto.numero}`
                            : c.descripcion || "Sin ref"}
                       </span>
                       {c.caja && <span className="text-[10px] font-bold text-emerald-600 uppercase italic">Dest: {c.caja.nombre}</span>}
                    </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-xl font-bold tabular-nums text-emerald-600">
                        +${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                     </p>
                     <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-gray-300 uppercase">{c.formaPago}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                   <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest tabular-nums italic">
                      ID: {c.id.substring(0,8).toUpperCase()}
                   </div>
                   <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="p-1 px-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                </div>
              </div>
            </div>
          ))}
          {filteredCobranzas.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
               <Receipt size={48} className="text-gray-100 mx-auto mb-4" />
               <p className="text-gray-400 font-medium">No se encontraron cobranzas</p>
            </div>
          )}
        </div>
      </main>

      <Drawer 
        isOpen={mostrarForm} 
        onClose={() => setMostrarForm(false)} 
        title="Registrar Cobro"
      >
        <div className="p-1 space-y-6">
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Origen del Ingreso</label>
             <div className="grid grid-cols-2 gap-3">
                {(["PRESUPUESTO", "COBRANZA_VARIA"] as const).map((t) => (
                  <button 
                    key={t} 
                    onClick={() => { setTipo(t); setPptoInfo(null); setPresupuestoId(""); }}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${tipo === t ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                    {t === "PRESUPUESTO" ? "Presupuesto" : "Cobro Vario"}
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Cliente *</label>
              <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setPresupuestoId(""); setPptoInfo(null); }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-600 rounded-xl text-sm font-bold outline-none uppercase appearance-none cursor-pointer">
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}`.toUpperCase() : c.nombre.toUpperCase()}</option>)}
              </select>
            </div>

            {tipo === "PRESUPUESTO" ? (
              <div className="space-y-6">
                {clienteId && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider ml-1">Presupuesto Pendiente</label>
                    {pptoCargando ? <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-center gap-3"><Activity size={16} className="text-emerald-500 animate-spin" /><span className="text-xs font-bold text-gray-400 uppercase">Buscando presupuestos...</span></div> : (
                      <select value={presupuestoId} onChange={(e) => {
                        setPresupuestoId(e.target.value);
                        const p = presupuestos.find((x) => x.id === e.target.value);
                        setPptoInfo(p || null);
                        if (p) setImporte(p.saldo.toString());
                      }}
                        className="w-full px-4 py-3 bg-gray-900 text-emerald-400 border-transparent rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                        <option value="">Vincular presupuesto...</option>
                        {presupuestos.map((p) => <option key={p.id} value={p.id}>Ppto #{p.numero} — Saldo: ${p.saldo.toLocaleString("es-AR")}</option>)}
                      </select>
                    )}
                    {presupuestos.length === 0 && !pptoCargando && clienteId && (
                      <p className="text-[10px] font-bold text-red-500 uppercase ml-1 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> El cliente no tiene presupuestos con saldo pendiente
                      </p>
                    )}
                  </div>
                )}

                {pptoInfo && (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-base font-bold text-gray-900">${pptoInfo.total.toLocaleString("es-AR")}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ya Cobrado</p>
                        <p className="text-base font-bold text-emerald-600">${pptoInfo.cobrado.toLocaleString("es-AR")}</p>
                     </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Descripción *</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Motivo del cobro..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-600 rounded-xl text-sm font-medium outline-none uppercase" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Medio de Pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-600 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider ml-1">Caja Destino *</label>
                <select value={cajaId} onChange={(e) => setCajaId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 text-emerald-500 border-transparent rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {formaPago === "CHEQUE" && (
              <div className="p-5 bg-gray-950 rounded-2xl space-y-4 border border-emerald-500/20">
                 <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Datos del Cheque</p>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="N° Cheque" value={chequeNumero} onChange={e => setChequeNumero(e.target.value)} className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white font-bold text-xs outline-none uppercase"/>
                    <input type="text" placeholder="Banco" value={chequeBanco} onChange={e => setChequeBanco(e.target.value)} className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white font-bold text-xs outline-none uppercase"/>
                    <div className="space-y-1">
                       <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Emisión</label>
                       <input type="date" value={chequeFechaEmision} onChange={e => setChequeFechaEmision(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white font-bold text-[10px] outline-none"/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-bold text-emerald-500 uppercase ml-1">Cobro</label>
                       <input type="date" value={chequeFechaCobro} onChange={e => setChequeFechaCobro(e.target.value)} className="w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-white font-bold text-[10px] outline-none"/>
                    </div>
                 </div>
              </div>
            )}

            <div className="p-6 bg-gray-950 rounded-2xl border-b-4 border-emerald-600 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 text-center block">Importe a Cobrar *</label>
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
              disabled={guardando || !importe || !cajaId || (tipo === "PRESUPUESTO" ? !presupuestoId : !descripcion)}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
            >
              {guardando ? "Procesando..." : "Confirmar Cobro"}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Anular Cobranza"
        message="¿Estás seguro de eliminar este ingreso? Esta acción impactará en el balance de la caja seleccionada de forma permanente."
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarCobranza(confirmDelete)}
      />
    </div>
  );
}

export default function CobranzasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-emerald-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Iniciando módulo de cobranzas...</div>
    </div>}>
      <CobranzasContent />
    </Suspense>
  );
}
