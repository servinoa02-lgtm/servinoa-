"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEstado, estadoColors, TODOS_ESTADOS, FLUJO_ESTADOS } from "@/lib/estados";
import { Wrench, Phone, FileText, Send, AlertTriangle, ArrowLeft, Printer, User, Calendar, Briefcase, ChevronRight, CheckCircle2 } from "lucide-react";

export default function OrdenDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [orden, setOrden] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"falla" | "revision" | "notas">("falla");
  const [revisionTexto, setRevisionTexto] = useState("");
  
  // Notas
  const [nuevaNota, setNuevaNota] = useState("");
  const [esSeguimiento, setEsSeguimiento] = useState(false);

  const [mostrarTodosEstados, setMostrarTodosEstados] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargarOT = () => {
    fetch(`/api/ordenes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrden(data);
        setRevisionTexto(data.revisionTecnica || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (id) cargarOT();
  }, [id]);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!orden) return;
    
    // Validación de negocio
    if (nuevoEstado === "PARA_PRESUPUESTAR" && !orden.revisionTecnica?.trim() && !mostrarTodosEstados) {
      alert("No se puede pasar a presupuestar sin una Revisión Técnica guardada por el técnico.");
      setActiveTab("revision");
      return;
    }

    setActualizando(true);
    await fetch(`/api/ordenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    cargarOT();
    setActualizando(false);
    setMostrarTodosEstados(false);
  };

  const guardarRevision = async () => {
    setActualizando(true);
    await fetch(`/api/ordenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionTecnica: revisionTexto }),
    });
    cargarOT();
    setActualizando(false);
    alert("Revisión técnica guardada exitosamente.");
  };

  const enviarNota = async () => {
    if (!nuevaNota.trim()) return;
    setActualizando(true);
    await fetch(`/api/ordenes/${id}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: nuevaNota, esSeguimiento }),
    });
    setNuevaNota("");
    setEsSeguimiento(false);
    cargarOT();
    setActualizando(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        Sincronizando Detalles de OT...
      </div>
    );
  }

  if (!orden || orden.error) return <div className="p-10 text-center text-red-600 font-black uppercase tracking-widest bg-gray-50 min-h-screen flex items-center justify-center">REGISTRO DE ORDEN NO IDENTIFICADO</div>;

  const siguientesEstados = FLUJO_ESTADOS[orden.estado] || [];
  const equipoStr = [orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre].filter(Boolean).join(" - ");
  
  const totalPresupuestado = orden.presupuestos?.reduce((sum: number, p: any) => {
    const pTotal = p.items?.reduce((s: number, i: any) => s + i.total, 0) || p.total || 0;
    return sum + pTotal;
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      
      {/* Header Industrial */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/ordenes" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1 lg:mb-0">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Operaciones</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">EXPEDIENTE TÉCNICO</span>
              </div>
              <div className="flex items-center gap-4">
                 <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">OT #{orden.numero}</h1>
                 <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 shadow-sm ${estadoColors[orden.estado] || "bg-white border-gray-200 text-gray-500"}`}>
                   {formatEstado(orden.estado)}
                 </span>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6 pr-4">
             {totalPresupuestado > 0 && (
               <div className="text-right border-r border-gray-200 pr-6 mr-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TOTAL COTIZADO</p>
                  <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">${totalPresupuestado.toLocaleString('es-AR')}</p>
               </div>
             )}
             <button onClick={() => window.print()} className="bg-gray-900 text-white px-8 py-4 rounded-xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-900/20 uppercase tracking-widest flex items-center gap-3">
               <Printer size={20} /> COMPROBANTE
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* PANEL DE TRANSICION DE ESTADO */}
        <section className="lg:col-span-12">
           <div className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-3 text-gray-400">
                 <ChevronRight size={24} className="text-red-600" />
                 <span className="text-xs font-black uppercase tracking-widest">SIGUIENTE ETAPA OPERATIVA:</span>
              </div>
              <div className="flex flex-wrap gap-4 flex-1">
                {siguientesEstados.length > 0 ? (
                    siguientesEstados.map((est: string) => (
                      <button 
                        key={est} 
                        onClick={() => cambiarEstado(est)} 
                        disabled={actualizando} 
                        className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] border-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 ${estadoColors[est] || "border-gray-200 bg-gray-50 text-gray-500"}`}>
                        PASAR A {formatEstado(est)}
                      </button>
                    ))
                ) : <span className="text-gray-400 font-black italic text-sm uppercase tracking-widest">FLUJO DE TRABAJO FINALIZADO</span>}
              </div>
              <div className="border-t md:border-t-0 md:border-l border-gray-100 px-6 pt-4 md:pt-0">
                <button onClick={() => setMostrarTodosEstados(!mostrarTodosEstados)} className="text-[10px] text-gray-400 hover:text-red-600 font-black uppercase tracking-widest transition-colors">
                  {mostrarTodosEstados ? "[OCULTAR INTERVENCIÓN MANUAL]" : "[FORZAR TRANSICIÓN MANUAL]"}
                </button>
              </div>
           </div>
           
           {mostrarTodosEstados && (
             <div className="flex flex-wrap gap-3 mt-6 p-6 bg-gray-900 rounded-3xl border-2 border-gray-800 animate-in slide-in-from-top duration-500">
               {TODOS_ESTADOS.filter((e: string) => e !== orden.estado).map((est: string) => (
                 <button key={est} onClick={() => cambiarEstado(est)} disabled={actualizando} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-gray-700 text-gray-400 hover:text-white hover:border-red-600 transition-all">
                   {formatEstado(est)}
                 </button>
               ))}
             </div>
           )}
        </section>

        {/* COLUMNA IZQ: RESUMEN TECNICO-COMERCIAL */}
        <aside className="lg:col-span-4 space-y-10">
            
            {/* CARD CLIENTE */}
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
               <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <User size={18} className="text-red-600" />
                    <h2 className="font-black text-gray-900 text-xs uppercase tracking-widest">Información Titular</h2>
                 </div>
                 {orden.cliente.id && <Link href={`/clientes/${orden.cliente.id}`} className="text-[10px] font-black text-red-600 hover:underline uppercase">Ver Ficha</Link>}
               </div>
               <div className="p-8 space-y-6">
                 <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">TITULAR / EMPRESA</span>
                    <strong className="text-xl font-black text-gray-900 italic uppercase tracking-tighter block">{orden.cliente.empresa ? `${orden.cliente.empresa.nombre} (${orden.cliente.nombre})` : orden.cliente.nombre}</strong>
                 </div>
                 {orden.cliente.telefono && (
                   <a href={`https://wa.me/${orden.cliente.telefono.replace(/\D/g,'')}`} className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all">
                      <Phone size={20} />
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-70">COMUNICACIÓN DIRECTA</span>
                         <span className="text-base font-black italic tracking-tight">{orden.cliente.telefono}</span>
                      </div>
                   </a>
                 )}
               </div>
            </div>

            {/* CARD EQUIPO */}
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
               <div className="bg-gray-900 px-8 py-5 flex items-center gap-3">
                  <Wrench size={18} className="text-red-600" />
                  <h2 className="font-black text-white text-xs uppercase tracking-widest">Configuración Unidad</h2>
               </div>
               <div className="p-8 space-y-6">
                 <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">MAQUINARIA — MARCA — MODELO</span>
                    <p className="font-black text-gray-900 text-lg italic uppercase tracking-tighter">{equipoStr}</p>
                 </div>
                 {orden.nroSerie && (
                   <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Número de Serie</span>
                      <span className="text-sm font-black text-red-600 font-mono italic tracking-widest">{orden.nroSerie}</span>
                   </div>
                 )}
                 <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">INVENTARIO (RECEPCIÓN)</span>
                    <p className="text-sm font-bold text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 italic">{orden.accesorios || "SIN DETALLE"}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                       <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">ALTA SISTEMA</span>
                       <div className="flex items-center gap-2 font-black text-gray-900 text-sm italic"><Calendar size={14} className="text-red-600"/>{new Date(orden.fechaRecepcion).toLocaleDateString("es-AR")}</div>
                    </div>
                    <div>
                       <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">PROMESA ENTREGA</span>
                       <div className={`flex items-center gap-2 font-black text-sm italic ${orden.fechaEstimadaEntrega && new Date(orden.fechaEstimadaEntrega) < new Date() ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                          <Calendar size={14} className="opacity-40"/>{orden.fechaEstimadaEntrega ? new Date(orden.fechaEstimadaEntrega).toLocaleDateString("es-AR") : "PND"}
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* CARD PRESUPUESTOS */}
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
               <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <FileText size={18} className="text-red-600" />
                     <h2 className="font-black text-gray-900 text-xs uppercase tracking-widest">Historial de Costos</h2>
                  </div>
               </div>
               <div className="p-6 space-y-4">
                 {orden.presupuestos.length === 0 ? (
                    <div className="text-center py-8 opacity-30 flex flex-col items-center gap-3">
                       <FileText size={32} />
                       <p className="text-[10px] font-black uppercase tracking-widest">Sin cotizaciones activas</p>
                    </div>
                 ) : 
                   orden.presupuestos.map((p: any) => (
                     <div key={p.id} onClick={() => router.push(`/presupuestos/${p.id}`)} className="p-5 border-2 border-gray-100 rounded-2xl cursor-pointer hover:border-red-600 transition-all bg-white group shadow-sm active:scale-[0.98]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-gray-900 text-sm italic tracking-tighter uppercase group-hover:text-red-600 transition-colors">Cotización #{p.numero}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${p.estado === 'APROBADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : p.estado === 'RECHAZADO' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{p.estado}</span>
                        </div>
                        <div className="text-2xl font-black text-red-600 italic tracking-tighter">${p.total?.toLocaleString('es-AR')}</div>
                     </div>
                   ))
                 }
                 {(orden.estado === "PARA_PRESUPUESTAR" || orden.estado === "REVISADO") && (
                   <button onClick={() => router.push(`/presupuestos/nuevo?otId=${orden.id}`)} className="w-full mt-2 bg-red-600 text-white rounded-2xl py-5 text-xs font-black hover:bg-red-700 shadow-xl shadow-red-600/20 uppercase tracking-widest transition-all">+ GENERAR COTIZACIÓN</button>
                 )}
               </div>
            </div>
        </aside>

        {/* COLUMNA DERECHA: FLUJO DINAMICO (TABS) */}
        <div className="lg:col-span-8 space-y-10">
           <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden h-full flex flex-col">
               
               {/* Nav Industrial V3 */}
               <div className="flex border-b-2 border-gray-100 bg-gray-50/50 overflow-x-auto">
                 <button onClick={() => setActiveTab('falla')} className={`px-10 py-6 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'falla' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    REPORTE FALLA
                    {activeTab === 'falla' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                 </button>
                 <button onClick={() => setActiveTab('revision')} className={`px-10 py-6 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-3 ${activeTab === 'revision' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    REVISIÓN TÉCNICA
                    {!orden.revisionTecnica && <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>}
                    {activeTab === 'revision' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                 </button>
                 <button onClick={() => setActiveTab('notas')} className={`px-10 py-6 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-3 ${activeTab === 'notas' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    BITÁCORA INTERNA
                    <span className="bg-gray-200 text-gray-500 text-[9px] px-2 py-0.5 rounded-full font-black">{orden.notas?.length || 0}</span>
                    {activeTab === 'notas' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                 </button>
               </div>

               {/* Tab Content Industrial */}
               <div className="p-10 flex-1">
                  {activeTab === 'falla' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left duration-500">
                      <div>
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 pl-1">DESCRIPCIÓN OPERATIVA DEL CLIENTE</h3>
                         <div className="bg-gray-50 p-8 rounded-3xl border-2 border-gray-100 text-lg font-bold text-gray-800 italic uppercase tracking-tight whitespace-pre-wrap shadow-inner leading-relaxed">
                            {orden.falla || "REGISTRO DE FALLA NO ESPECIFICADO EN RECEPCIÓN."}
                         </div>
                      </div>
                      {orden.observaciones && (
                        <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-100 text-sm text-red-900 uppercase italic font-black shadow-sm leading-relaxed">
                           <span className="text-red-600 text-[10px] font-black mb-2 block tracking-widest">NOTA DE ADMINISTRACIÓN:</span>
                           {orden.observaciones}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'revision' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">DIAGNÓSTICO TÉCNICO AVANZADO {orden.tecnico?.nombre ? `[ RESPONSABLE: ${orden.tecnico.nombre.toUpperCase()} ]` : ''}</h3>
                         <CheckCircle2 className={`${orden.revisionTecnica ? "text-emerald-500" : "text-gray-200"}`} />
                      </div>
                      <textarea 
                         value={revisionTexto} onChange={e => setRevisionTexto(e.target.value)}
                         className="w-full flex-1 min-h-[300px] p-8 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none focus:border-red-600 focus:bg-white text-lg font-bold italic tracking-tight placeholder:italic transition-all shadow-inner leading-relaxed"
                         placeholder="Detallar diagnóstico técnico, repuestos necesarios y observaciones para validación comercial..."
                      />
                      <div className="flex justify-end pt-4">
                         <button onClick={guardarRevision} disabled={actualizando} className="bg-gray-900 text-white px-10 py-5 rounded-2xl text-xs font-black hover:bg-black disabled:opacity-50 transition-all uppercase tracking-widest shadow-xl shadow-gray-900/20 active:scale-95">SALVAR EXPEDIENTE TÉCNICO</button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notas' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       {/* Editor de Notas */}
                       <div className="bg-gray-50 border-2 border-gray-100 p-8 rounded-3xl space-y-6 shadow-sm">
                          <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} className="w-full p-6 bg-white border-2 border-gray-100 rounded-2xl text-base font-bold italic outline-none focus:border-red-600 shadow-sm transition-all" rows={3} placeholder="REGISTRAR NUEVO EVENTO O ALERTA..." />
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                             <label className="flex items-center gap-4 text-xs text-red-600 cursor-pointer font-black p-4 bg-red-50 rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95">
                                <input type="checkbox" checked={esSeguimiento} onChange={e => setEsSeguimiento(e.target.checked)} className="w-6 h-6 text-red-600 border-2 border-red-600 rounded focus:ring-red-600" />
                                <AlertTriangle size={20}/> ACTIVAR ALERTA EN DASHBOARD
                             </label>
                             <button onClick={enviarNota} disabled={actualizando} className="w-full sm:w-auto bg-red-600 text-white px-8 py-5 rounded-2xl text-xs font-black flex items-center justify-center gap-3 hover:bg-red-700 shadow-xl shadow-red-600/20 uppercase tracking-widest transition-all active:scale-95 font-sans"><Send size={18}/> PUBLICAR NOTA</button>
                          </div>
                       </div>

                       {/* Timeline de Notas */}
                       <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                         {orden.notas?.map((nota: any) => (
                           <div key={nota.id} className={`p-8 rounded-3xl border-2 transition-all hover:border-red-600 group relative ${nota.esSeguimiento ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                             {nota.esSeguimiento && <AlertTriangle size={24} className="absolute -top-3 -right-3 text-red-600 bg-white rounded-full p-1 border-2 border-red-600 shadow-lg" />}
                             <div className="flex justify-between items-start mb-4 text-[10px] font-black uppercase tracking-widest">
                               <div className="flex items-center gap-2">
                                  <User size={12} className="text-gray-400"/>
                                  <span className="text-gray-900 italic">{nota.usuario?.nombre || 'SISTEMA'}</span>
                               </div>
                               <span className="text-gray-400 tabular-nums">{new Date(nota.fecha).toLocaleString('es-AR')}</span>
                             </div>
                             <p className={`text-base font-bold italic tracking-tight leading-relaxed ${nota.esSeguimiento ? 'text-red-900' : 'text-gray-700'}`}>{nota.texto}</p>
                           </div>
                         ))}
                         {(!orden.notas || orden.notas.length === 0) && (
                            <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                               <Briefcase size={64} />
                               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin registro de actividad</p>
                            </div>
                         )}
                       </div>
                    </div>
                  )}
               </div>

           </div>
        </div>
      </main>
    </div>
  );
}