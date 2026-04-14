"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import { formatEstado, estadoColors, TODOS_ESTADOS, FLUJO_ESTADOS } from "@/lib/estados";
import { formatFecha, formatFechaHora } from "@/lib/dateUtils";
import { Wrench, Phone, FileText, Send, AlertTriangle, ArrowLeft, Printer, User, Calendar, ChevronRight, CheckCircle2, MoreHorizontal, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CierreOTModal } from "@/components/ot/CierreOTModal";
import { formatoService } from "@/services/formatoService";
import { useToast } from "@/context/ToastContext";

export default function OrdenDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { showToast } = useToast();
  const [orden, setOrden] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"falla" | "revision" | "notas">("falla");
  const [revisionTexto, setRevisionTexto] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");
  const [esSeguimiento, setEsSeguimiento] = useState(false);
  const [mostrarTodosEstados, setMostrarTodosEstados] = useState(false);
  const [cierrePendiente, setCierrePendiente] = useState<"ENTREGADO_REALIZADO" | "ENTREGADO_SIN_REALIZAR" | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargarOT = () => {
    fetch(`/api/ordenes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrden(data);
        // Solo sobrescribir si el usuario NO ha modificado el texto localmente
        if (!isDirty) {
          setRevisionTexto(data.revisionTecnica || "");
        }
        setLoading(false);
      })
      .catch(() => {
        showToast("Error al cargar la orden", "error");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (id) cargarOT();
  }, [id]);

  // Se eliminó useAutoRefresh para evitar pérdida de datos al escribir diagnósticos.

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!orden) return;
    if (nuevoEstado === "PARA_PRESUPUESTAR" && !orden.revisionTecnica?.trim() && !mostrarTodosEstados) {
      showToast("Se requiere una Revisión Técnica guardada antes de presupuestar.", "error");
      setActiveTab("revision");
      return;
    }
    // Interceptar cierres de OT: requieren constancia de retiro con firma.
    // Solo cuando el cambio viene del flujo natural (no del menú "Más estados" que es escape de admin).
    if (
      !mostrarTodosEstados &&
      (nuevoEstado === "ENTREGADO_REALIZADO" || nuevoEstado === "ENTREGADO_SIN_REALIZAR")
    ) {
      setCierrePendiente(nuevoEstado);
      return;
    }
    setActualizando(true);
    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Error al cambiar estado", "error");
    }
    cargarOT();
    setActualizando(false);
    setMostrarTodosEstados(false);
  };

  const confirmarCierreOT = async (data: { nombre: string; dni: string; firma: string }) => {
    if (!orden || !cierrePendiente) return;
    const res = await fetch(`/api/ordenes/${id}/retiros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tipoEntrega: cierrePendiente }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo registrar el retiro.");
    }
    setCierrePendiente(null);
    cargarOT();
  };

  const guardarRevision = async () => {
    setActualizando(true);
    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionTecnica: formatoService.capitalizarPrimeraLetra(revisionTexto) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Error al guardar diagnóstico", "error");
    } else {
      showToast("Diagnóstico guardado", "success");
    }
    cargarOT();
    setIsDirty(false);
    setActualizando(false);
  };

  const enviarNota = async () => {
    if (!nuevaNota.trim()) return;
    setActualizando(true);
    const res = await fetch(`/api/ordenes/${id}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: formatoService.capitalizarPrimeraLetra(nuevaNota), esSeguimiento }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Error al enviar nota", "error");
    }
    setNuevaNota("");
    setEsSeguimiento(false);
    cargarOT();
    setActualizando(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando expediente...</div>
      </div>
    );
  }

  if (!orden || orden.error) return <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">Orden no encontrada</div>;

  const siguientesEstadosBase = FLUJO_ESTADOS[orden.estado] || [];

  // Coherencia APROBADO ↔ RECHAZADO en PARA_ENTREGAR (filtro visual; ADMIN puede forzar desde "Más estados").
  const historial: Array<{ estadoNuevo: string }> = orden.historial || [];
  const tuvoRechazado = historial.some((h) => h.estadoNuevo === "RECHAZADO");
  const tuvoAprobado = historial.some((h) => h.estadoNuevo === "APROBADO");
  const siguientesEstados = siguientesEstadosBase.filter((est: string) => {
    if (orden.estado !== "PARA_ENTREGAR") return true;
    if (est === "ENTREGADO_REALIZADO" && tuvoRechazado && !tuvoAprobado) return false;
    if (est === "ENTREGADO_SIN_REALIZAR" && tuvoAprobado && !tuvoRechazado) return false;
    return true;
  });

  const equipoStr = [orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre].filter(Boolean).join(" - ");
  const totalPresupuestado = orden.presupuestos?.reduce((sum: number, p: any) => sum + (p.total || 0), 0) || 0;
  const ultimoRetiro = orden.retiros?.[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/ordenes" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orden de Trabajo</p>
                <StatusBadge status={orden.estado} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OT #{orden.numero}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md flex items-center gap-2 uppercase tracking-wider">
              <Printer size={18} /> Imprimir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full space-y-8">
        
        {/* Flujo de Estados */}
        <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-gray-500">
             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Próxima acción:</span>
          </div>
          <div className="flex flex-wrap gap-2 flex-1 justify-center sm:justify-start">
            {siguientesEstados.map((est: string) => (
              <button key={est} onClick={() => cambiarEstado(est)} disabled={actualizando} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-700 hover:border-red-600 hover:text-red-600 transition-all disabled:opacity-50">
                Pasar a {formatEstado(est)}
              </button>
            ))}
          </div>
          <button onClick={() => setMostrarTodosEstados(!mostrarTodosEstados)} className="text-[10px] text-gray-300 hover:text-red-600 font-bold uppercase tracking-tighter">
            {mostrarTodosEstados ? "Cerrar menú" : "Más estados"}
          </button>
        </section>

        {mostrarTodosEstados && (
          <div className="flex flex-wrap gap-2 p-4 bg-gray-900 rounded-2xl border border-gray-800 animate-in slide-in-from-top">
            {TODOS_ESTADOS.map((est: string) => (
              <button key={est} onClick={() => cambiarEstado(est)} className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border border-gray-700 text-gray-500 hover:text-white hover:border-red-600 transition-all">
                {formatEstado(est)}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Información Lateral */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-red-600" /> Cliente</h2>
                {orden.cliente.id && <Link href={`/clientes/${orden.cliente.id}`} className="text-[9px] font-bold text-red-600 uppercase">Ficha completa</Link>}
              </div>
              <div className="p-6">
                <p className="text-base font-bold text-gray-900 uppercase mb-4 leading-tight">
                  {orden.cliente.empresa ? orden.cliente.empresa.nombre : orden.cliente.nombre}
                </p>
                {orden.cliente.empresa && <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Ref: {orden.cliente.nombre}</p>}
                
                {orden.cliente.telefono && (
                  <a href={`https://wa.me/${orden.cliente.telefono.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all">
                    <Phone size={16} />
                    <span className="text-xs font-bold leading-none">{orden.cliente.telefono}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Wrench size={14} className="text-red-600" /> Detalle del Equipo</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Identificación</label>
                  <p className="text-sm font-bold text-gray-900 uppercase">{equipoStr}</p>
                </div>
                {orden.nroSerie && (
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Número de Serie</label>
                    <p className="text-sm font-mono font-bold text-red-600 tracking-wider">{orden.nroSerie}</p>
                  </div>
                )}
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Accesorios</label>
                  <p className="text-xs font-medium text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 italic">{orden.accesorios || "Ninguno"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Carga</label>
                    <p className="text-[10px] font-bold text-gray-900">{formatFecha(orden.fechaRecepcion)}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Entrega Est.</label>
                    <p className={`text-[10px] font-bold ${orden.fechaEstimadaEntrega && new Date(orden.fechaEstimadaEntrega) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {orden.fechaEstimadaEntrega ? formatFecha(orden.fechaEstimadaEntrega) : "PND"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {ultimoRetiro && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600" /> Constancia de Retiro
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Retira</label>
                    <p className="text-sm font-bold text-gray-900 uppercase leading-tight">{ultimoRetiro.nombre}</p>
                    <p className="text-[10px] font-mono font-bold text-gray-500 mt-0.5">DNI {ultimoRetiro.dni}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fecha</label>
                    <p className="text-[10px] font-bold text-gray-700">{formatFechaHora(ultimoRetiro.fecha)}</p>
                  </div>
                  {ultimoRetiro.firma && (
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Firma</label>
                      <div className="border border-gray-200 rounded-xl bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ultimoRetiro.firma} alt="Firma del receptor" className="w-full h-24 object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-red-600" /> Presupuestos asociados</h2>
                <button onClick={() => router.push(`/presupuestos/nuevo?otId=${orden.id}`)} className="text-[9px] font-bold text-red-600 uppercase border border-red-600 px-2 py-0.5 rounded-lg hover:bg-red-600 hover:text-white transition-all">Crear</button>
              </div>
              <div className="p-4 space-y-2">
                {orden.presupuestos.length === 0 ? (
                  <p className="text-[10px] text-center text-gray-400 py-4 italic font-medium">Sin cotizaciones</p>
                ) : (
                  orden.presupuestos.map((p: any) => (
                    <div key={p.id} onClick={() => router.push(`/presupuestos/${p.id}`)} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/30 hover:bg-white hover:border-red-200 transition-all cursor-pointer">
                      <div>
                        <p className="text-[10px] font-bold text-gray-900">#PQ-{p.numero}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase">{p.estado}</p>
                      </div>
                      <p className="text-xs font-bold text-red-600 tracking-tight">${p.total?.toLocaleString('es-AR')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Columna Central: Pestañas */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {orden.estado === "PARA_PRESUPUESTAR" && orden.presupuestos.length === 0 && (
               <div className="bg-amber-50 border-2 border-amber-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                     <FileText size={24} />
                   </div>
                   <div>
                     <h3 className="text-amber-900 font-bold uppercase text-lg">Requiere Presupuesto</h3>
                     <p className="text-amber-700/80 text-xs font-bold uppercase tracking-widest mt-0.5">El diagnóstico fue registrado. El cliente espera una cotización.</p>
                   </div>
                 </div>
                 <button 
                   onClick={() => router.push(`/presupuestos/nuevo?otId=${orden.id}`)}
                   className="w-full sm:w-auto bg-amber-500 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <FileText size={18} /> Iniciar Presupuesto
                 </button>
               </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
              <div className="flex border-b border-gray-100 bg-gray-50/30">
                {[
                  { id: "falla", label: "Informe de Falla" },
                  { id: "revision", label: "Diagnóstico Técnico" },
                  { id: "notas", label: "Notas / Bitácora" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-4 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                      activeTab === tab.id ? "text-red-600 bg-white" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                  </button>
                ))}
              </div>

              <div className="p-8 flex-1 bg-white">
                {activeTab === "falla" && (
                  <div className="space-y-6 animate-in fade-in">
                    <div>
                      <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Declaración del ingreso</h3>
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm font-bold text-gray-800 uppercase italic leading-relaxed">
                        {orden.falla || "No especificada."}
                      </div>
                    </div>
                    {orden.observaciones && (
                      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-xs text-red-900 uppercase italic font-bold">
                        <span className="text-red-600 text-[8px] font-bold mb-1 block">Observación Adm:</span>
                        {orden.observaciones}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "revision" && (
                  <div className="space-y-6 animate-in fade-in flex flex-col h-full">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                         Revisión del Especialista {orden.tecnico?.nombre ? `(${orden.tecnico.nombre})` : ''}
                       </h3>
                       {orden.revisionTecnica && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                    <textarea 
                       value={revisionTexto} 
                       onChange={e => {
                         setRevisionTexto(formatoService.capitalizarPrimeraLetra(e.target.value));
                         setIsDirty(true);
                       }}
                       className="w-full flex-1 min-h-[250px] p-6 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-red-600 focus:bg-white text-sm font-bold italic transition-all leading-relaxed"
                       placeholder="Describa el diagnóstico aquí..."
                    />
                    <div className="flex justify-end pt-4">
                       <button onClick={guardarRevision} disabled={actualizando} className="bg-gray-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold hover:bg-black transition-all uppercase tracking-widest shadow-md active:scale-[0.98] disabled:opacity-50">Guardar Diagnóstico</button>
                    </div>
                  </div>
                )}

                {activeTab === "notas" && (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
                      <textarea value={nuevaNota} onChange={e => setNuevaNota(formatoService.capitalizarPrimeraLetra(e.target.value))} className="w-full p-4 bg-white border border-gray-100 rounded-xl text-xs font-bold italic outline-none focus:border-red-600 transition-all" rows={3} placeholder="Registrar nuevo evento..." />
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <label className="flex items-center gap-3 text-[9px] text-gray-500 font-bold uppercase cursor-pointer">
                          <input type="checkbox" checked={esSeguimiento} onChange={e => setEsSeguimiento(e.target.checked)} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-600" />
                          Marcar como alerta en Dashboard
                        </label>
                        <button onClick={enviarNota} disabled={actualizando} className="w-full sm:w-auto bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all uppercase">
                          <Send size={14}/> Publicar Nota
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {orden.notas?.map((nota: any) => (
                        <div key={nota.id} className={`p-5 rounded-2xl border transition-all ${nota.esSeguimiento ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[9px] font-bold uppercase text-gray-400 italic">
                               {nota.usuario?.nombre || 'SISTEMA'} — {formatFechaHora(nota.fecha)}
                             </span>
                             {nota.esSeguimiento && <AlertTriangle size={14} className="text-red-600" />}
                          </div>
                          <p className={`text-xs font-bold italic leading-relaxed uppercase ${nota.esSeguimiento ? 'text-red-900' : 'text-gray-700'}`}>{nota.texto}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <CierreOTModal
        isOpen={cierrePendiente !== null}
        destino={cierrePendiente}
        ordenNumero={orden.numero}
        onCancel={() => setCierrePendiente(null)}
        onConfirm={confirmarCierreOT}
      />
    </div>
  );
}