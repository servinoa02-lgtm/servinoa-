"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Plus, Trash2, Save, User, Wrench, CreditCard, ChevronRight, FileText, Receipt, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
  empresa?: { nombre: string } | null;
}

interface Orden {
  id: string;
  numero: number;
  cliente: { id: string; nombre: string; empresa?: { nombre: string } | null };
  maquina?: { nombre: string } | null;
  marca?: { nombre: string } | null;
  modelo?: { nombre: string } | null;
}

interface Item {
  cantidad: number;
  descripcion: string;
  precio: number;
}

function NuevoPresupuestoForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const otId = searchParams.get("otId");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [orden, setOrden] = useState<Orden | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState<Item[]>([{ cantidad: 1, descripcion: "", precio: 0 }]);
  const [observaciones, setObservaciones] = useState("");
  const [incluyeIva, setIncluyeIva] = useState(false);
  const [formaPago, setFormaPago] = useState("Contado");
  const [validezDias, setValidezDias] = useState(7);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Nuevo Cliente
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmpresa, setNuevoEmpresa] = useState("Particular");
  const [nuevoDni, setNuevoDni] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
  }, []);

  useEffect(() => {
    if (otId) {
      fetch(`/api/ordenes/${otId}`)
        .then((r) => r.json())
        .then((data) => {
          setOrden(data);
          setClienteId(data.cliente?.id || "");
        });
    }
  }, [otId]);

  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const iva = incluyeIva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;

  const agregarItem = () => setItems([...items, { cantidad: 1, descripcion: "", precio: 0 }]);
  const eliminarItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };

  const actualizarItem = (idx: number, campo: keyof Item, valor: string | number) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: campo === "descripcion" ? (valor as string).toUpperCase() : parseFloat(valor as string) || 0 };
    setItems(nuevos);
  };

  const handleCrearCliente = async () => {
    if (!nuevoNombre) return;
    setCreandoCliente(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre.toUpperCase(), telefono: nuevoTelefono, empresaNombre: nuevoEmpresa !== "Particular" ? nuevoEmpresa.toUpperCase() : null, dni: nuevoDni }),
    });
    if (res.ok) {
      const cliente = await res.json();
      setClientes((prev) => [...prev, cliente]);
      setClienteId(cliente.id);
      setMostrarNuevoCliente(false);
      setNuevoNombre(""); setNuevoTelefono(""); setNuevoEmpresa("Particular"); setNuevoDni("");
    }
    setCreandoCliente(false);
  };

  const guardar = async () => {
    if (!clienteId) { setError("SE REQUIERE SELECCIÓN DE CLIENTE PARA PROSEGUIR"); return; }
    if (items.some((i) => !i.descripcion)) { setError("DETALLE OPERATIVO INCOMPLETO EN UNO O MÁS ÍTEMS"); return; }
    setGuardando(true);
    setError("");

    const res = await fetch("/api/presupuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        ordenId: otId || null,
        usuarioId: (session?.user as { id?: string })?.id,
        items, observaciones, incluyeIva, formaPago, validezDias, moneda: "ARS",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/presupuestos/${data.id}`);
    } else {
      setError("ERROR CRÍTICO AL INTENTAR CONSOLIDAR EL PRESUPUESTO");
      setGuardando(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        INICIALIZANDO PROTOCOLO DE COTIZACIÓN...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200 active:scale-90">
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Administración</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">NUEVA COTIZACIÓN TÉCNICA</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Alta de Presupuesto</h1>
            </div>
          </div>
          <button onClick={guardar} disabled={guardando} className="bg-red-600 text-white px-10 py-5 rounded-2xl text-xs font-black hover:bg-red-700 disabled:opacity-50 transition-all shadow-xl shadow-red-600/30 uppercase tracking-[0.2em] flex items-center gap-3 active:scale-95">
            <Save size={20} /> {guardando ? "Sincronizando..." : "CONSOLIDAR VENTA"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 lg:px-10 py-10 w-full lg:space-y-12">
        {error && (
            <div className="bg-gray-900 border-2 border-red-600 text-red-600 px-8 py-5 rounded-[24px] shadow-2xl shadow-red-600/20 font-black uppercase tracking-[0.2em] italic flex items-center gap-4 animate-in slide-in-from-top duration-500">
                <AlertTriangle size={24} />
                {error}
                <button onClick={() => setError("")} className="ml-auto text-[10px] underline">CERRAR AVISO</button>
            </div>
        )}

        {orden && (
          <div className="bg-white border-2 border-red-50 p-6 rounded-[32px] flex items-center gap-6 shadow-sm animate-in fade-in duration-700">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 italic font-black">OT</div>
            <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">ACCIÓN VINCULADA A ORDEN DE TRABAJO</p>
                <p className="text-base font-black text-gray-900 italic uppercase tracking-tighter">
                   #{orden.numero} — {[orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre].filter(Boolean).join(" - ")}
                </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           
           {/* SECCIÓN CLIENTE */}
           <section className="lg:col-span-12 bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden">
              <div className="bg-gray-900 px-10 py-6 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <User size={20} className="text-red-600" />
                    <h2 className="font-black text-white text-[11px] uppercase tracking-[0.3em]">Identificación Comercial del Cliente</h2>
                 </div>
                 {!orden && (
                    <button type="button" onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)} className="text-[10px] font-black text-red-600 hover:underline uppercase tracking-widest transition-all">
                       {mostrarNuevoCliente ? "[ SELECCIONAR EXISTENTE ]" : "[ + ALTA RÁPIDA DE CLIENTE ]"}
                    </button>
                 )}
              </div>
              <div className="p-10">
                 {orden ? (
                    <div className="px-8 py-6 bg-gray-50 border-2 border-gray-100 rounded-3xl">
                       <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">TITULAR REGISTRADO EN OT</span>
                       <strong className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter">
                          {orden.cliente?.empresa?.nombre ? `${orden.cliente.empresa.nombre} - ${orden.cliente.nombre}` : orden.cliente?.nombre}
                       </strong>
                    </div>
                 ) : !mostrarNuevoCliente ? (
                    <div className="relative group">
                       <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[28px] text-lg font-black italic outline-none transition-all uppercase tracking-tight italic appearance-none cursor-pointer">
                          <option value="">SELECCIONE CLIENTE DESDE EL PADRÓN...</option>
                          {clientes.map((c) => (
                             <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}`.toUpperCase() : c.nombre.toUpperCase()}</option>
                          ))}
                       </select>
                       <ChevronRight size={24} className="absolute right-8 top-1/2 -translate-y-1/2 text-red-600 rotate-90 pointer-events-none opacity-50" />
                    </div>
                 ) : (
                    <div className="bg-red-50/30 border-2 border-red-100 rounded-[32px] p-8 space-y-8 animate-in slide-in-from-right duration-500">
                       <h3 className="text-xs font-black uppercase text-red-600 tracking-[0.3em]">Protocolo de Alta Rápida</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">NOMBRE COMPLETO / RAZÓN SOCIAL *</label>
                             <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">EMPRESA (OPCIONAL)</label>
                             <input type="text" value={nuevoEmpresa} onChange={(e) => setNuevoEmpresa(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner" placeholder="PARTICULAR" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">TELÉFONO DE CONTACTO</label>
                             <input type="text" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner" />
                          </div>
                          <div className="flex items-end">
                             <button onClick={handleCrearCliente} disabled={!nuevoNombre || creandoCliente} className="w-full py-5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-900/20 uppercase tracking-widest disabled:opacity-50">
                                {creandoCliente ? "PROCESANDO..." : "REGISTRAR CLIENTE Y VINCULAR"}
                             </button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </section>

           {/* DETALLE DE ÍTEMS */}
           <section className="lg:col-span-12 bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-10 py-8 border-b-2 border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <FileText size={24} className="text-red-600" />
                    <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Protocolo de Ítems a Cotizar</h2>
                 </div>
                 <button onClick={agregarItem} className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black hover:bg-black transition-all uppercase tracking-widest shadow-xl shadow-gray-900/20 active:scale-95">
                    <Plus size={18} /> AÑADIR LÍNEA OPERATIVA
                 </button>
              </div>

              <div className="p-10">
                 <div className="hidden lg:grid grid-cols-12 gap-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-6 mb-6">
                    <div className="col-span-1">CANT.</div>
                    <div className="col-span-6">DESCRIPCIÓN DEL TRABAJO / REPUESTO</div>
                    <div className="col-span-2 text-right">P. UNITARIO ($)</div>
                    <div className="col-span-2 text-right">SUBTOTAL</div>
                    <div className="col-span-1 text-center">ELIM.</div>
                 </div>

                 <div className="space-y-6">
                    {items.map((item, idx) => (
                       <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-6 bg-gray-50 border-2 border-gray-100 rounded-[32px] group hover:border-red-600 transition-all animate-in slide-in-from-right duration-300">
                          <input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarItem(idx, "cantidad", e.target.value)} 
                                 className="col-span-1 px-4 py-5 bg-white border-2 border-gray-100 rounded-2xl text-lg font-black text-center outline-none focus:border-red-600 transition-all italic tracking-tighter shadow-inner" />
                          
                          <input type="text" value={item.descripcion} onChange={(e) => actualizarItem(idx, "descripcion", e.target.value)} 
                                 placeholder="EJ: REPARACIÓN DE BOBINADO, RECAMBIO DE INTERRUPTOR..." 
                                 className="col-span-6 px-8 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner placeholder:text-gray-200" />
                          
                          <input type="number" min="0" step="0.01" value={item.precio || ""} onChange={(e) => actualizarItem(idx, "precio", e.target.value)} 
                                 placeholder="0.00" 
                                 className="col-span-2 px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-lg font-black italic text-right outline-none focus:border-red-600 transition-all font-mono shadow-inner italic" />
                          
                          <div className="col-span-2 text-right text-xl font-black text-red-600 italic tracking-tighter pr-4">
                             ${(item.cantidad * item.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </div>
                          
                          <button onClick={() => eliminarItem(idx)} disabled={items.length === 1} className="col-span-1 flex justify-center text-gray-200 hover:text-red-600 transition-colors disabled:opacity-0 active:scale-75">
                             <Trash2 size={24} />
                          </button>
                       </div>
                    ))}
                 </div>

                 <div className="mt-16 bg-gray-900 rounded-[40px] p-10 space-y-8 max-w-lg ml-auto shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                       <Receipt size={120} className="text-white" />
                    </div>
                    <div className="space-y-4 relative z-10 font-black">
                       <div className="flex justify-between items-center text-gray-500 text-xs uppercase tracking-[0.2em] border-b border-gray-800 pb-4">
                          <span>SUBTOTAL BRUTO</span>
                          <span>${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className={`flex justify-between items-center text-xs uppercase tracking-[0.2em] border-b border-gray-800 pb-4 ${incluyeIva ? 'text-red-600' : 'text-gray-700 font-bold opacity-30 italic'}`}>
                          <span>IVA {incluyeIva ? "(21%)" : "NO APLICADO"}</span>
                          <span>${iva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between items-center pt-4">
                          <span className="text-white text-xs uppercase tracking-[0.3em]">IMPORTE TOTAL FINAL</span>
                          <span className="text-4xl font-black text-white italic tracking-tighter italic font-mono uppercase">
                             ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                       </div>
                    </div>
                 </div>
              </div>
           </section>

           {/* CONDICIONES */}
           <section className="lg:col-span-12 bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 p-10 space-y-10">
              <div className="flex items-center gap-4">
                 <CreditCard size={24} className="text-red-600" />
                 <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Condiciones Comerciales y Logísticas</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">TRATAMIENTO FISCAL</label>
                    <div className="relative group">
                       <select value={incluyeIva ? "si" : "no"} onChange={(e) => setIncluyeIva(e.target.value === "si")} className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-xs font-black italic outline-none transition-all uppercase tracking-widest appearance-none cursor-pointer">
                          <option value="no">EXENTO — SIN RECUPERO IVA</option>
                          <option value="si">ALTA ALÍCUOTA — IVA 21%</option>
                       </select>
                       <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-red-600 rotate-90 pointer-events-none opacity-50" />
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">MODALIDAD DE PAGO</label>
                    <div className="relative group">
                       <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-xs font-black italic outline-none transition-all uppercase tracking-widest appearance-none cursor-pointer">
                          <option>CONTADO / TRANSFERENCIA</option>
                          <option>CHEQUE DIFERIDO — 30 DÍAS</option>
                          <option>CHEQUE DIFERIDO — 60 DÍAS</option>
                          <option>PLATAFORMAS DIGITALES (METERPAGO)</option>
                          <option>CONVENIO CORPORATIVO ESPECIAL</option>
                       </select>
                       <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-red-600 rotate-90 pointer-events-none opacity-50" />
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">VALIDEZ DE LA OFERTA</label>
                    <div className="relative">
                       <input type="number" value={validezDias} onChange={(e) => setValidezDias(parseInt(e.target.value) || 7)} className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-base font-black italic outline-none transition-all pr-20 text-right italic" />
                       <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300 text-[10px] font-black uppercase tracking-widest">DÍAS</span>
                    </div>
                 </div>
              </div>

              <div className="border-t-2 border-gray-100 pt-10">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-4">OBSERVACIONES Y NOTAS AL PIE DEL DOCUMENTO</label>
                 <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value.toUpperCase())} rows={3} placeholder="ACLARACIONES TÉCNICAS O COMERCIALES PARA EL RECEPTOR..." className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[28px] text-sm font-black italic outline-none resize-none transition-all shadow-inner placeholder:text-gray-200" />
              </div>
           </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full px-6 lg:px-10 py-12">
          <div className="border-t-2 border-gray-200 pt-10 text-center">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic leading-relaxed">SISTEMA INTEGRAL DE COTIZACIONES — SERVINOA V3.0<br/>ACTA DE PROTOCOLO ELECTRÓNICO INCORRUPTIBLE — SEGURIDAD NIVEL 4</p>
          </div>
      </footer>
    </div>
  );
}

export default function NuevoPresupuestoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">SINCRONIZANDO COTIZADOR EN TIEMPO REAL...</div>}>
      <NuevoPresupuestoForm />
    </Suspense>
  );
}
