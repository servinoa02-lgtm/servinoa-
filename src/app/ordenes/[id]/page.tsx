"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEstado, estadoColors, TODOS_ESTADOS, FLUJO_ESTADOS } from "@/lib/estados";
import { Wrench, Phone, FileText, Send, AlertTriangle } from "lucide-react";

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
    
    // Validación de negocio (solo para flujo normal, el override manual la omite)
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

  if (status === "loading" || loading) return <div className="p-10 text-center animate-pulse">Cargando OT...</div>;
  if (!orden || orden.error) return <div className="p-10 text-center text-red-500">OT no encontrada</div>;

  const siguientesEstados = FLUJO_ESTADOS[orden.estado] || [];
  const equipoStr = [orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre].filter(Boolean).join(" - ");
  
  // Calcular total presupuestado
  const totalPresupuestado = orden.presupuestos?.reduce((sum: number, p: any) => {
    const pTotal = p.items?.reduce((s: number, i: any) => s + i.total, 0) || p.total || 0;
    return sum + pTotal;
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 sm:px-8 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/ordenes")} className="text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium">← Volver</button>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">OT #{orden.numero}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${estadoColors[orden.estado] || "bg-slate-200 text-slate-700"}`}>
            {formatEstado(orden.estado)}
          </span>
          {totalPresupuestado > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
              💰 ${totalPresupuestado.toLocaleString('es-AR')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
           <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-slate-700 font-medium hidden sm:block">Imprimir Recibo</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* PANEL ESTADOS RAPIDO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Acciones Rápidas (Transición de Estado)</p>
           <div className="flex flex-wrap gap-2">
             {siguientesEstados.length > 0 ? (
                 siguientesEstados.map((est: string) => (
                   <button key={est} onClick={() => cambiarEstado(est)} disabled={actualizando} className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-all disabled:opacity-50 ${estadoColors[est] || "border-2 border-slate-200"}`}>
                     Mover a {formatEstado(est)} →
                   </button>
                 ))
             ) : <span className="text-slate-500 text-sm">Flujo completado.</span>}
           </div>
           <div className="mt-3 pt-3 border-t border-slate-100">
             <button onClick={() => setMostrarTodosEstados(!mostrarTodosEstados)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
               {mostrarTodosEstados ? "Ocultar estados manuales" : "⚙ Forzar otro estado manualmente..."}
             </button>
             {mostrarTodosEstados && (
               <div className="flex flex-wrap gap-2 mt-3">
                 {TODOS_ESTADOS.filter((e: string) => e !== orden.estado).map((est: string) => (
                   <button key={est} onClick={() => cambiarEstado(est)} disabled={actualizando} className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-medium">
                     {formatEstado(est)}
                   </button>
                 ))}
               </div>
             )}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQ: INFO ESTATICA */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                 <Wrench size={16} className="text-slate-500" />
                 <h2 className="font-semibold text-slate-700 text-sm">Información General</h2>
               </div>
               <div className="p-5 space-y-4 text-sm text-slate-600">
                 <div><span className="block text-xs uppercase tracking-wider text-slate-400 mb-0.5">Cliente</span><strong className="text-slate-800 font-semibold">{orden.cliente.empresa ? `${orden.cliente.empresa.nombre} (${orden.cliente.nombre})` : orden.cliente.nombre}</strong></div>
                 {orden.cliente.telefono && <a href={`https://wa.me/${orden.cliente.telefono.replace(/\\D/g,'')}`} className="text-emerald-600 font-medium flex items-center gap-1 hover:underline"><Phone size={14}/> {orden.cliente.telefono}</a>}
                 <hr className="border-slate-100"/>
                 <div><span className="block text-xs uppercase tracking-wider text-slate-400 mb-0.5">Equipo</span><span className="font-medium text-slate-800">{equipoStr}</span></div>
                 {orden.nroSerie && <div className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded inline-block text-xs font-mono font-bold border border-yellow-200">S/N: {orden.nroSerie}</div>}
                 <div><span className="block text-xs uppercase tracking-wider text-slate-400 mb-0.5">Inventario</span><span>{orden.accesorios}</span></div>
                 <hr className="border-slate-100"/>
                 <div className="grid grid-cols-2 gap-2">
                   <div><span className="block text-xs uppercase tracking-wider text-slate-400">Ingreso</span><span className="font-medium">{new Date(orden.fechaRecepcion).toLocaleDateString("es-AR")}</span></div>
                   <div><span className="block text-xs uppercase tracking-wider text-slate-400">Entrega Est.</span><span className={`font-bold ${orden.fechaEstimadaEntrega && new Date(orden.fechaEstimadaEntrega) < new Date() ? 'text-red-500' : 'text-slate-800'}`}>{orden.fechaEstimadaEntrega ? new Date(orden.fechaEstimadaEntrega).toLocaleDateString("es-AR") : "-"}</span></div>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                 <h2 className="font-semibold text-slate-700 text-sm">Presupuestos Cotizados</h2>
               </div>
               <div className="p-4 space-y-3">
                 {orden.presupuestos.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Sin presupuestos</p> : 
                   orden.presupuestos.map((p: any) => (
                     <div key={p.id} onClick={() => router.push(`/presupuestos/${p.id}`)} className="p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-800 text-sm">Ppto #{p.numero}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${p.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : p.estado === 'RECHAZADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.estado}</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">${p.total?.toLocaleString('es-AR')}</div>
                     </div>
                   ))
                 }
                 {(orden.estado === "PARA_PRESUPUESTAR" || orden.estado === "REVISADO") && (
                   <button onClick={() => router.push(`/presupuestos/nuevo?otId=${orden.id}`)} className="w-full mt-2 bg-slate-900 text-white rounded-xl py-2 text-sm font-semibold hover:bg-slate-800">+ Generar Presupuesto</button>
                 )}
               </div>
            </div>

          </div>

          {/* COLUMNA CENTRAL: TABLAS DINAMICAS */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 
                 {/* Tabs Nav */}
                 <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
                   <button onClick={() => setActiveTab('falla')} className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'falla' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>Falla del Cliente</button>
                   <button onClick={() => setActiveTab('revision')} className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'revision' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>Revisión Técnica {!orden.revisionTecnica && <span className="w-2 h-2 rounded-full bg-red-500"></span>}</button>
                   <button onClick={() => setActiveTab('notas')} className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${activeTab === 'notas' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>Historial y Notas <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{orden.notas?.length || 0}</span></button>
                 </div>

                 {/* Tab Content */}
                 <div className="p-6">
                    {activeTab === 'falla' && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción textual del cliente</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">{orden.falla || "No se detalló."}</div>
                        {orden.observaciones && (
                          <div className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-800">
                             <strong>Observación de Recepción:</strong><br/>{orden.observaciones}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'revision' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informe del Técnico Asignado {orden.tecnico?.nombre ? `(${orden.tecnico.nombre})` : ''}</h3>
                        </div>
                        <textarea 
                           value={revisionTexto} onChange={e => setRevisionTexto(e.target.value)}
                           className="w-full h-40 p-4 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none bg-slate-50 focus:bg-white transition-colors"
                           placeholder="Detallar diagnóstico técnico, repuestos necesarios y observaciones para que ventas apruebe u cotice..."
                        />
                        <div className="flex justify-end">
                           <button onClick={guardarRevision} disabled={actualizando} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">Guardar Informe Técnico</button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'notas' && (
                      <div className="space-y-6">
                         {/* Formulario Nota */}
                         <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-3 outline-none" rows={2} placeholder="Agregar una bitácora interna o estado..." />
                            <div className="flex items-center justify-between">
                               <label className="flex items-center gap-2 text-sm text-rose-700 cursor-pointer font-medium p-2 bg-rose-50 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors">
                                  <input type="checkbox" checked={esSeguimiento} onChange={e => setEsSeguimiento(e.target.checked)} className="w-4 h-4 text-rose-600 rounded" />
                                  <AlertTriangle size={16}/> Marcar como ALERTA (Dashboard)
                               </label>
                               <button onClick={enviarNota} disabled={actualizando} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-700"><Send size={14}/> Guardar Nota</button>
                            </div>
                         </div>

                         {/* Historial Notas */}
                         <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                           {orden.notas?.map((nota: any) => (
                             <div key={nota.id} className={`p-4 rounded-xl border ${nota.esSeguimiento ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'} shadow-sm`}>
                               <div className="flex justify-between items-start mb-1 text-xs text-slate-500">
                                 <span className="font-semibold">{nota.usuario?.nombre || 'Sistema'}</span>
                                 <span>{new Date(nota.fecha).toLocaleString('es-AR')}</span>
                               </div>
                               <p className={`text-sm ${nota.esSeguimiento ? 'text-rose-800 font-medium' : 'text-slate-700'}`}>{nota.texto}</p>
                             </div>
                           ))}
                           {(!orden.notas || orden.notas.length === 0) && <p className="text-center text-sm text-slate-400 py-4">Sin historial.</p>}
                         </div>
                      </div>
                    )}
                 </div>

             </div>
          </div>
        </div>
      </main>
    </div>
  );
}