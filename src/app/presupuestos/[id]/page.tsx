"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Receipt, User, Wrench, Clock, CreditCard, Printer, Save, Edit, Trash2, CheckCircle2, XCircle, ChevronRight, AlertTriangle, Plus } from "lucide-react";

interface Presupuesto {
  id: string;
  numero: number;
  fecha: string;
  estado: string;
  estadoCobro: string;
  facturaNumero: string | null;
  observaciones: string | null;
  incluyeIva: boolean;
  formaPago: string;
  validezDias: number;
  moneda: string;
  total: number;
  cobrado: number;
  saldo: number;
  cliente: { id: string; nombre: string; empresa?: { nombre: string } | null };
  orden: { numero: number; id: string; maquina?: { nombre: string } | null; marca?: { nombre: string } | null; modelo?: { nombre: string } | null; nroSerie?: string | null; falla?: string | null } | null;
  usuario: { nombre: string };
  items: { id: string; cantidad: number; descripcion: string; precio: number; total: number }[];
  cobranzas: { id: string; fecha: string; importe: number; formaPago: string; caja: { nombre: string } }[];
}

const estadoColors: Record<string, string> = {
  BORRADOR: "border-gray-200 text-gray-400 bg-white",
  PRESUPUESTADO: "border-blue-600 text-blue-600 bg-blue-50",
  APROBADO: "border-emerald-600 text-emerald-600 bg-emerald-50",
  RECHAZADO: "border-red-600 text-red-600 bg-red-50",
};

function formatNumero(numero: number, fecha: string) {
  const year = new Date(fecha).getFullYear();
  return `${year}-${numero.toString().padStart(5, "0")}`;
}

export default function PresupuestoDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ppto, setPpto] = useState<Presupuesto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editItems, setEditItems] = useState<{ id?: string; cantidad: number; descripcion: string; precio: number }[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id) {
      fetch(`/api/presupuestos/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setPpto(data);
          setEditItems(data.items.map((i: any) => ({ ...i, precio: i.precio, cantidad: i.cantidad })));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  const guardarEdicionItems = async () => {
    if (editItems.length === 0 || editItems.some(i => !i.descripcion.trim())) {
      alert("SE REQUIERE AL MENOS UN ÍTEM CON DESCRIPCIÓN TÉCNICA.");
      return;
    }
    setActualizando(true);
    const res = await fetch(`/api/presupuestos/${id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: editItems }),
    });
    if (res.ok) {
      setModoEdicion(false);
      const dRes = await fetch(`/api/presupuestos/${id}`);
      const data = await dRes.json();
      setPpto(data);
      setEditItems(data.items.map((i: any) => ({ ...i, precio: i.precio, cantidad: i.cantidad })));
    } else {
      alert("ERROR ESTRUCTURAL AL INTENTAR ACTUALIZAR LA COTIZACIÓN.");
    }
    setActualizando(false);
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!ppto) return;
    setActualizando(true);
    const res = await fetch(`/api/presupuestos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      const data = await res.json();
      setPpto(data);
    }
    setActualizando(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        Sincronizando Presupuesto #########...
      </div>
    );
  }

  if (!ppto || (ppto as { error?: string }).error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-10">
        <div className="text-center space-y-4">
           <AlertTriangle size={64} className="mx-auto text-red-600" />
           <p className="text-red-900 font-black uppercase tracking-widest text-xl italic">DOCUMENTO NO INDEXADO O INACCESIBLE</p>
           <Link href="/presupuestos" className="text-xs font-black text-gray-400 hover:text-red-600 uppercase transition-colors underline">[ REGRESAR AL MAESTRO ]</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      
      {/* Header Industrial */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/presupuestos" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Administración</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">PROPUESTA COMERCIAL</span>
              </div>
              <div className="flex items-center gap-4">
                 <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">PPTO #{formatNumero(ppto.numero, ppto.fecha)}</h1>
                 <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 shadow-sm ${estadoColors[ppto.estado] || "border-gray-200 text-gray-400"}`}>
                   {ppto.estado}
                 </span>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6">
             <div className="text-right border-r border-gray-200 pr-6 mr-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">IMPORTE TOTAL</p>
                <p className="text-3xl font-black text-red-600 italic tracking-tighter">${ppto.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
             </div>
             <button onClick={() => window.print()} className="bg-gray-900 text-white px-8 py-4 rounded-xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-900/20 uppercase tracking-widest flex items-center gap-3">
               <Printer size={20} /> IMPRIMIR PDF
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* PANEL DE DECISIÓN (Si está enviado) */}
        {ppto.estado === "PRESUPUESTADO" && (
          <section className="lg:col-span-12 animate-in slide-in-from-top duration-500">
             <div className="bg-white rounded-3xl p-8 border-2 border-red-100 shadow-xl flex flex-col md:flex-row items-center gap-8">
                <div className="flex items-center gap-4 flex-1">
                   <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 italic font-black text-xl">?</div>
                   <div>
                      <h2 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter">Validación de Respuesta del Cliente</h2>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">PENDIENTE DE APROBACIÓN PARA INICIAR REPARACIÓN</p>
                   </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                   <button onClick={() => cambiarEstado("APROBADO")} disabled={actualizando} className="flex-1 md:flex-none bg-emerald-600 text-white px-10 py-5 rounded-2xl text-xs font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/30 uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95">
                      <CheckCircle2 size={20} /> CONFIRMAR APROBACIÓN
                   </button>
                   <button onClick={() => cambiarEstado("RECHAZADO")} disabled={actualizando} className="flex-1 md:flex-none bg-red-600 text-white px-10 py-5 rounded-2xl text-xs font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95">
                      <XCircle size={20} /> REGISTRAR RECHAZO
                   </button>
                </div>
             </div>
          </section>
        )}

        {/* COLUMNA IZQUIERDA: RESUMEN Y DATOS */}
        <aside className="lg:col-span-4 space-y-10">
           
           {/* ENTIDAD CLIENTE */}
           <section className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
              <div className="bg-gray-900 px-8 py-5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <User size={18} className="text-red-600" />
                    <h2 className="font-black text-white text-[10px] uppercase tracking-widest">Titular del Expediente</h2>
                 </div>
                 <Link href={`/clientes/${ppto.cliente.id}`} className="text-[10px] font-black text-red-600 hover:underline uppercase transition-all tracking-widest flex items-center gap-1 group">VER FICHA <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform"/></Link>
              </div>
              <div className="p-8 space-y-8">
                 <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">ENTIDAD / RAZÓN SOCIAL</span>
                    <strong className="text-xl font-black text-gray-900 italic uppercase tracking-tighter block leading-tight">
                       {ppto.cliente?.empresa?.nombre ? ppto.cliente.empresa.nombre : ppto.cliente?.nombre}
                    </strong>
                    {ppto.cliente?.empresa && <p className="text-xs font-black text-gray-400 uppercase italic mt-1 tracking-widest">{ppto.cliente.nombre}</p>}
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6 pt-6 border-t border-gray-100 text-[11px] font-black">
                    <div className="flex justify-between items-center text-gray-400">
                       <span className="uppercase tracking-widest">CONDICIÓN IMPOSITIVA</span>
                       <span className="text-gray-900 italic uppercase">{ppto.incluyeIva ? "REQ. IVA 21%" : "SIN IVA"}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                       <span className="uppercase tracking-widest">COMPROMISO DE PAGO</span>
                       <span className="text-gray-900 italic uppercase">{ppto.formaPago}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                       <span className="uppercase tracking-widest">VALIDEZ OFERTA</span>
                       <span className="text-gray-900 italic uppercase">{ppto.validezDias} DÍAS CORRIDOS</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                       <span className="uppercase tracking-widest">RESPONSABLE EMISOR</span>
                       <span className="text-gray-900 italic uppercase">{ppto.usuario?.nombre}</span>
                    </div>
                 </div>
              </div>
           </section>

           {/* OPERATIVA VINCULADA (OT) */}
           {ppto.orden && (
             <section className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100 flex items-center justify-between group cursor-pointer" onClick={() => router.push(`/ordenes/${ppto.orden!.id}`)}>
                    <div className="flex items-center gap-3">
                        <Wrench size={18} className="text-red-600" />
                        <h2 className="font-black text-gray-900 text-[10px] uppercase tracking-widest">Operativa Asociada</h2>
                    </div>
                    <span className="text-[10px] font-black text-red-600 group-hover:underline uppercase tracking-widest">OT #{ppto.orden.numero}</span>
                </div>
                <div className="p-8 space-y-6">
                   <div>
                      <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">MAQUINARIA A INTERVENIR</span>
                      <p className="text-base font-black text-gray-900 italic uppercase tracking-tighter">
                         {[ppto.orden.maquina?.nombre, ppto.orden.marca?.nombre, ppto.orden.modelo?.nombre].filter(Boolean).join(" - ")}
                      </p>
                   </div>
                   {ppto.orden.nroSerie && (
                     <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IDENTIFICADOR SERIE</span>
                        <span className="text-sm font-black text-red-600 font-mono italic tracking-widest">{ppto.orden.nroSerie}</span>
                     </div>
                   )}
                </div>
             </section>
           )}

           {/* RESUMEN FINANCIERO */}
           <section className="bg-gray-900 rounded-[32px] overflow-hidden p-8 space-y-8 shadow-2xl relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <CreditCard size={100} className="text-white" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-4">ESTADO DE CUENTA PPTO</p>
                 <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                       <span className="text-xs font-black text-gray-400 uppercase">DEUDA CONSOLIDADA</span>
                       <span className="text-2xl font-black text-white italic tracking-tighter">${ppto.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                       <span className="text-xs font-black text-emerald-600 uppercase">PAGO PERCIBIDO</span>
                       <span className="text-2xl font-black text-emerald-600 italic tracking-tighter">${ppto.cobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                       <span className="text-xs font-black text-gray-500 uppercase">SALDO PENDIENTE</span>
                       <span className={`text-4xl font-black italic tracking-tighter ${ppto.saldo > 0 ? "text-red-600" : "text-emerald-500"}`}>
                          ${ppto.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                       </span>
                    </div>
                 </div>
              </div>
              {ppto.estado === "APROBADO" && ppto.saldo > 0 && (
                <button onClick={() => router.push(`/cobranzas/nueva?presupuestoId=${ppto.id}`)} className="w-full bg-emerald-600 text-white py-5 rounded-2xl text-[10px] font-black hover:bg-emerald-700 transition-all uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/40">
                   + REGISTRAR INGRESO CAJA
                </button>
              )}
           </section>
        </aside>

        {/* COLUMNA DERECHA: ÍTEMS Y DETALLES */}
        <div className="lg:col-span-8 space-y-10">
           
           <div className="bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden flex flex-col h-full">
              
              <div className="px-10 py-8 border-b-2 border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <div className="flex items-center gap-4">
                    <FileText size={24} className="text-red-600" />
                    <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Planilla de Ítems Técnicos</h2>
                 </div>
                 {ppto.estado !== "APROBADO" && ppto.estado !== "RECHAZADO" && !modoEdicion && (
                   <button onClick={() => setModoEdicion(true)} className="flex items-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black hover:bg-black transition-all uppercase tracking-widest shadow-lg shadow-gray-900/20 active:scale-95">
                      <Edit size={16}/> EDITAR PROTOCOLO
                   </button>
                 )}
              </div>

              <div className="p-10 flex-1">
                 
                 {!modoEdicion ? (
                   <div className="animate-in fade-in duration-500">
                     <table className="w-full border-separate border-spacing-y-4">
                       <thead>
                         <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            <th className="px-6 pb-2 text-left">CANT.</th>
                            <th className="px-6 pb-2 text-left">DESCRIPCIÓN OPERATIVA</th>
                            <th className="px-6 pb-2 text-right">UNITARIO</th>
                            <th className="px-6 pb-2 text-right">SUBTOTAL</th>
                         </tr>
                       </thead>
                       <tbody>
                         {ppto.items.map((item) => (
                           <tr key={item.id}>
                             <td className="px-6 py-5 bg-gray-50 rounded-l-2xl border-y-2 border-l-2 border-gray-100 font-black text-gray-900 text-base italic">{item.cantidad}</td>
                             <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 font-bold text-gray-800 uppercase italic text-sm tracking-tight">{item.descripcion}</td>
                             <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 text-right font-black text-gray-400 italic font-mono">${item.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                             <td className="px-6 py-5 bg-gray-50 rounded-r-2xl border-y-2 border-r-2 border-gray-100 text-right font-black text-red-600 italic text-lg tracking-tighter shadow-sm">
                                ${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>

                     <div className="mt-12 bg-gray-900 rounded-[32px] p-10 space-y-6">
                        {ppto.incluyeIva && (
                           <>
                              <div className="flex justify-between items-center text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-gray-800 pb-4">
                                 <span>BASE IMPONIBLE (NETO)</span>
                                 <span>${(ppto.total / 1.21).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-red-600 font-black text-[10px] uppercase tracking-widest border-b border-gray-800 pb-4">
                                 <span>ÍNDICE IVA (21%)</span>
                                 <span>${(ppto.total - ppto.total / 1.21).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                              </div>
                           </>
                        )}
                        <div className="flex justify-between items-center">
                           <span className="text-white font-black text-xs uppercase tracking-[0.3em]">RECONOCIMIENTO TOTAL FINAL</span>
                           <span className="text-4xl font-black text-white italic tracking-tighter">${ppto.total.toLocaleString("es-AR")}</span>
                        </div>
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-8 animate-in slide-in-from-right duration-500">
                      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {editItems.map((item, idx) => (
                          <div key={idx} className="bg-gray-50 border-2 border-gray-100 p-8 rounded-[32px] relative group hover:border-red-600 transition-all flex flex-col gap-6 shadow-sm">
                             <button onClick={() => editItems.length > 1 && setEditItems(editItems.filter((_, i) => i !== idx))} className="absolute top-4 right-4 p-3 text-gray-300 hover:text-red-600 transition-colors bg-white rounded-xl border border-gray-100 shadow-sm"><Trash2 size={20}/></button>
                             
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">DESCRIPCIÓN DEL ÍTEM TÉCNICO</label>
                                <input type="text" value={item.descripcion} onChange={e => { const n = [...editItems]; n[idx].descripcion = e.target.value.toUpperCase(); setEditItems(n); }} 
                                       className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner" placeholder="ESPECIFICACIÓN DE TAREA O REPUESTO..." />
                             </div>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">CANTIDAD</label>
                                   <input type="number" min="1" value={item.cantidad || ""} onChange={e => { const n = [...editItems]; n[idx].cantidad = parseFloat(e.target.value) || 0; setEditItems(n); }} 
                                          className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">PRECIO UNITARIO ($)</label>
                                   <input type="number" min="0" value={item.precio || ""} onChange={e => { const n = [...editItems]; n[idx].precio = parseFloat(e.target.value) || 0; setEditItems(n); }} 
                                          className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-black italic outline-none focus:border-red-600 transition-all uppercase tracking-tight shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1 opacity-50">SUBTOTAL LÍNEA</label>
                                   <div className="w-full px-6 py-5 bg-gray-100 border-2 border-transparent rounded-2xl text-lg font-black italic text-red-600 tracking-tighter text-right">
                                      ${((item.cantidad || 0) * (item.precio || 0)).toLocaleString("es-AR")}
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t-2 border-gray-100 pt-8 mt-8">
                         <button onClick={() => setEditItems([...editItems, { cantidad: 1, descripcion: "", precio: 0 }])} className="w-full sm:w-auto px-10 py-5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95">
                            <Plus size={20}/> AÑADIR ÍTEM OPERATIVO
                         </button>
                         <div className="flex gap-4 w-full sm:w-auto">
                            <button onClick={() => setModoEdicion(false)} className="flex-1 sm:flex-none px-8 py-5 border-2 border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all">CANCELAR</button>
                            <button onClick={guardarEdicionItems} disabled={actualizando} className="flex-1 sm:flex-none px-10 py-5 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 active:scale-95">
                               <Save size={18}/> GUARDAR PROTOCOLO
                            </button>
                         </div>
                      </div>
                   </div>
                 )}

                 {ppto.observaciones && (
                    <div className="mt-12 p-8 bg-red-50 border-2 border-red-100 rounded-3xl text-sm italic font-black text-red-900 leading-relaxed animate-in fade-in duration-700">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1">NOTAS CONTRACTUALES:</span>
                        {ppto.observaciones.toUpperCase()}
                    </div>
                 )}

                 {/* TABLA DE COBRANZAS */}
                 <div className="mt-16 space-y-8">
                    <div className="flex items-center gap-4">
                        <Receipt size={24} className="text-emerald-600 opacity-50" />
                        <h3 className="text-base font-black text-gray-900 uppercase italic tracking-tighter">Historial de Cobros Recibidos</h3>
                    </div>
                    {ppto.cobranzas?.length > 0 ? (
                      <table className="w-full border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                             <th className="px-6 pb-2 text-left">FECHA TRANSACCIÓN</th>
                             <th className="px-6 pb-2 text-right">IMPORTE</th>
                             <th className="px-6 pb-2 text-left">MÉTODO PAGO</th>
                             <th className="px-6 pb-2 text-right">CAJA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ppto.cobranzas.map((c) => (
                            <tr key={c.id}>
                              <td className="px-6 py-4 bg-gray-50 border-y border-l border-gray-100 rounded-l-xl text-xs font-bold text-gray-400">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                              <td className="px-6 py-4 bg-gray-50 border-y border-gray-100 text-right font-black text-emerald-600 italic tracking-tight text-base">${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 bg-gray-50 border-y border-gray-100 text-xs font-black uppercase text-gray-500">{c.formaPago}</td>
                              <td className="px-6 py-4 bg-gray-50 border-y border-r border-gray-100 rounded-r-xl text-right font-black text-[10px] text-gray-400 uppercase tracking-widest italic">{c.caja?.nombre || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-10 rounded-3xl text-center">
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 italic">SIN REGISTROS DE LIQUIDACIÓN A LA FECHA</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="px-10 py-10 bg-gray-50 border-t-2 border-gray-100">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic text-center leading-relaxed">DOCUMENTACIÓN DE VALIDEZ COMERCIAL — SERVINOA V3.0<br/>ACTA DE PROTOCOLO ELECTRÓNICO INCORRUPTIBLE</p>
              </div>

           </div>
        </div>
      </main>
    </div>
  );
}
