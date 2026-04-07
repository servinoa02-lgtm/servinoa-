"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, FileText, Receipt, History, ExternalLink, Briefcase, Printer } from "lucide-react";

interface ClienteDetalle {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  dni?: string | null;
  domicilio?: string | null;
  iva: string;
  empresa?: { nombre: string; cuit?: string | null } | null;
  ordenes: { id: string; numero: number; estado: string; fechaRecepcion: string; maquina?: { nombre: string } | null; marca?: { nombre: string } | null; modelo?: { nombre: string } | null }[];
  presupuestos: { id: string; numero: number; fecha: string; estado: string; estadoCobro: string; total: number; cobrado: number; saldo: number; orden?: { numero: number } | null }[];
  cobranzas: { id: string; fecha: string; importe: number; formaPago: string; descripcion?: string | null; caja?: { nombre: string } | null; presupuesto?: { numero: number } | null }[];
  totalPresupuestado: number;
  totalCobrado: number;
  saldoPendiente: number;
}

const estadoOTColors: Record<string, string> = {
  RECIBIDO: "border-gray-200 text-gray-500",
  PARA_REVISAR: "border-amber-200 text-amber-600 bg-amber-50",
  EN_REVISION: "border-blue-200 text-blue-600 bg-blue-50",
  REVISADO: "border-orange-200 text-orange-600 bg-orange-50",
  PARA_PRESUPUESTAR: "border-red-600 text-red-600 bg-red-50",
  PRESUPUESTADO: "border-purple-200 text-purple-600 bg-purple-50",
  APROBADO: "border-emerald-600 text-emerald-600 bg-emerald-50",
  EN_REPARACION: "border-blue-400 text-blue-700 bg-blue-50",
  REPARADO: "border-emerald-400 text-emerald-700 bg-emerald-50",
  PARA_ENTREGAR: "border-cyan-400 text-cyan-700 bg-cyan-50",
  ENTREGADO_REALIZADO: "border-emerald-600 text-emerald-800 bg-emerald-100 font-bold",
  ENTREGADO_SIN_REALIZAR: "border-orange-400 text-orange-800 bg-orange-100",
  RECHAZADO: "border-red-800 text-red-800 bg-red-100",
};

function formatNumero(numero: number, fecha: string) {
  const year = new Date(fecha).getFullYear();
  return `${year}-${numero.toString().padStart(5, "0")}`;
}

export default function ClienteDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ots" | "pptos" | "cobranzas" | "cuenta">("ots");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id) {
      fetch(`/api/clientes/${id}`)
        .then((r) => r.json())
        .then((data) => { setCliente(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        Sincronizando Expediente de Cliente...
      </div>
    );
  }

  if (!cliente || (cliente as { error?: string }).error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-10">
        <div className="text-center space-y-4">
           <User size={64} className="mx-auto text-gray-300" />
           <p className="text-red-600 font-black uppercase tracking-widest text-xl italic">ENTIDAD NO IDENTIFICADA EN BASE DE DATOS</p>
           <Link href="/clientes" className="text-xs font-black text-gray-400 hover:text-red-600 uppercase transition-colors underline">[ VOLVER AL MAESTRO ]</Link>
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
            <Link href="/clientes" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1 lg:mb-0">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Maestro de Clientes</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">EXPEDIENTE COMERCIAL</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">{cliente.nombre}</h1>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6">
             <div className="text-right border-r border-gray-200 pr-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SALDO CONSOLIDADO</p>
                <p className={`text-3xl font-black italic tracking-tighter ${cliente.saldoPendiente > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ${cliente.saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
             </div>
             <button onClick={() => window.print()} className="bg-gray-900 text-white px-8 py-4 rounded-xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-900/20 uppercase tracking-widest flex items-center gap-3">
               <Printer size={20} /> RESUMEN
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* COLUMNA IZQUIERDA: INFORMACIÓN Y RESUMEN */}
        <aside className="lg:col-span-4 space-y-10">
           
           {/* CARD DATOS GENERALES */}
           <section className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
              <div className="bg-gray-900 px-8 py-5 flex items-center gap-3">
                 <User size={18} className="text-red-600" />
                 <h2 className="font-black text-white text-[10px] uppercase tracking-widest">Identificación Fiscal y Contacto</h2>
              </div>
              <div className="p-8 space-y-8">
                 {cliente.empresa && (
                   <div className="pb-6 border-b border-gray-100">
                      <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">RAZÓN SOCIAL / EMPRESA</span>
                      <strong className="text-xl font-black text-gray-900 italic uppercase tracking-tighter block">{cliente.empresa.nombre}</strong>
                      {cliente.empresa.cuit && <p className="text-sm font-bold text-red-600 font-mono tracking-widest mt-1">CUIT: {cliente.empresa.cuit}</p>}
                   </div>
                 )}
                 
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                        <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">IDENTIFICACIÓN</span>
                        <p className="text-base font-black text-gray-900 italic">{cliente.dni || "NO REGISTRADO"}</p>
                    </div>
                    <div>
                        <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">DOMICILIO OPERATIVO</span>
                        <p className="text-base font-black text-gray-900 italic flex items-center gap-2"><MapPin size={16} className="text-red-600"/> {cliente.domicilio || "NO REGISTRADO"}</p>
                    </div>
                    <div>
                        <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">CONDICIÓN IVA</span>
                        <p className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-black uppercase text-gray-600 border border-gray-200">{cliente.iva}</p>
                    </div>
                 </div>

                 {cliente.telefono && (
                   <a href={`https://wa.me/${cliente.telefono.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all">
                      <Phone size={24} />
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-70">WHATSAPP DIRECTO</span>
                         <span className="text-lg font-black italic tracking-tight">{cliente.telefono}</span>
                      </div>
                   </a>
                 )}

                 {cliente.email && (
                   <a href={`mailto:${cliente.email}`} className="flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border-2 border-blue-100 text-blue-700 hover:bg-blue-100 transition-all">
                      <Mail size={24} />
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-70">CORREO ELECTRÓNICO</span>
                         <span className="text-sm font-black italic tracking-tight lowercase break-all">{cliente.email}</span>
                      </div>
                   </a>
                 )}
              </div>
           </section>

           {/* CARD FINANCIERO EXPRESS */}
           <section className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden divide-y-2 divide-gray-100">
              <div className="p-8">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL ACUMULADO</span>
                    <History size={16} className="text-gray-300" />
                 </div>
                 <p className="text-2xl font-black text-gray-900 italic tracking-tighter">${cliente.totalPresupuestado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-8">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-emerald-600">TOTAL PERCIBIDO</span>
                    <CreditCard size={16} className="text-emerald-300" />
                 </div>
                 <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">${cliente.totalCobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
              </div>
           </section>

        </aside>

        {/* COLUMNA DERECHA: TABLAS Y OPERACIONES */}
        <div className="lg:col-span-8 space-y-10">
           
           <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden h-full flex flex-col">
              
              {/* Nav Industrial V3 */}
              <div className="flex border-b-2 border-gray-100 bg-gray-50/50 overflow-x-auto scroller-hidden">
                <button onClick={() => setTab('ots')} className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-3 whitespace-nowrap ${tab === 'ots' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    ÓRDENES TRABAJO
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tab === 'ots' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{cliente.ordenes.length}</span>
                    {tab === 'ots' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                </button>
                <button onClick={() => setTab('pptos')} className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-3 whitespace-nowrap ${tab === 'pptos' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    PRESUPUESTOS
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tab === 'pptos' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{cliente.presupuestos.length}</span>
                    {tab === 'pptos' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                </button>
                <button onClick={() => setTab('cobranzas')} className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-3 whitespace-nowrap ${tab === 'cobranzas' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    COBRANZAS RECIENTES
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tab === 'cobranzas' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{cliente.cobranzas.length}</span>
                    {tab === 'cobranzas' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                </button>
                <button onClick={() => setTab('cuenta')} className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-3 whitespace-nowrap ${tab === 'cuenta' ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-900 border-transparent'}`}>
                    ESTADO CUENTA
                    {tab === 'cuenta' && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                </button>
              </div>

              <div className="p-8 flex-1">
                
                {/* TAB: ORDENES */}
                {tab === 'ots' && (
                  <div className="animate-in fade-in slide-in-from-left duration-500">
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-y-4">
                        <thead>
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                             <th className="px-6 pb-2 text-left">Protocolo</th>
                             <th className="px-6 pb-2 text-left">Maquinaria / Configuración</th>
                             <th className="px-6 pb-2 text-left">Estado Operativo</th>
                             <th className="px-6 pb-2 text-right">Recepción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cliente.ordenes.map((o) => (
                            <tr key={o.id} onClick={() => router.push(`/ordenes/${o.id}`)} className="group cursor-pointer">
                              <td className="px-6 py-5 bg-gray-50 rounded-l-2xl border-y-2 border-l-2 border-gray-100 group-hover:border-red-600 transition-all font-black text-gray-900 italic tracking-tighter">OT #{o.numero}</td>
                              <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 group-hover:border-red-600 transition-all">
                                 <p className="text-xs font-black text-gray-700 uppercase italic tracking-tight">
                                    {[o.maquina?.nombre, o.marca?.nombre, o.modelo?.nombre].filter(Boolean).join(" - ") || "SIN ESPECIFICAR"}
                                 </p>
                              </td>
                              <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 group-hover:border-red-600 transition-all">
                                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 ${estadoOTColors[o.estado] || "border-gray-200 text-gray-400"}`}>
                                    {o.estado.replace(/_/g, " ")}
                                 </span>
                              </td>
                              <td className="px-6 py-5 bg-gray-50 rounded-r-2xl border-y-2 border-r-2 border-gray-100 group-hover:border-red-600 transition-all text-right font-bold text-xs text-gray-500 italic uppercase">
                                 {new Date(o.fechaRecepcion).toLocaleDateString("es-AR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {cliente.ordenes.length === 0 && (
                       <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                          <Briefcase size={64} />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin actividad operativa registrada</p>
                       </div>
                    )}
                  </div>
                )}

                {/* TAB: PRESUPUESTOS */}
                {tab === 'pptos' && (
                  <div className="animate-in fade-in slide-in-from-right duration-500">
                     <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-y-4">
                          <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                               <th className="px-6 pb-2 text-left">Documento</th>
                               <th className="px-6 pb-2 text-left">Asociado a</th>
                               <th className="px-6 pb-2 text-right">Total Neto</th>
                               <th className="px-6 pb-2 text-right">Saldo Deudor</th>
                               <th className="px-6 pb-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cliente.presupuestos.map((p) => (
                              <tr key={p.id} onClick={() => router.push(`/presupuestos/${p.id}`)} className="group cursor-pointer">
                                <td className="px-6 py-5 bg-gray-50 rounded-l-2xl border-y-2 border-l-2 border-gray-100 group-hover:border-red-600 transition-all font-black text-red-600 italic tracking-tighter uppercase">{formatNumero(p.numero, p.fecha)}</td>
                                <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 group-hover:border-red-600 transition-all font-bold text-xs text-gray-500 uppercase">{p.orden ? `OT #${p.orden.numero}` : "EXTERNO"}</td>
                                <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 group-hover:border-red-600 transition-all text-right font-black text-base italic tracking-tight text-gray-900">${p.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                                <td className={`px-6 py-5 bg-gray-50 border-y-2 border-gray-100 group-hover:border-red-600 transition-all text-right font-black text-base italic tracking-tight ${p.saldo > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                   ${p.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-5 bg-gray-50 rounded-r-2xl border-y-2 border-r-2 border-gray-100 group-hover:border-red-600 transition-all text-center">
                                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black border-2 uppercase tracking-widest ${p.estado === "APROBADO" ? "border-emerald-600 text-emerald-600 bg-emerald-50" : p.estado === "RECHAZADO" ? "border-red-600 text-red-600 bg-red-50" : "border-blue-600 text-blue-600 bg-blue-50"}`}>
                                      {p.estado}
                                   </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                     {cliente.presupuestos.length === 0 && (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                           <FileText size={64} />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin cotizaciones procesadas</p>
                        </div>
                     )}
                  </div>
                )}

                {/* TAB: COBRANZAS */}
                {tab === 'cobranzas' && (
                  <div className="animate-in fade-in slide-in-from-bottom duration-500">
                     <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-y-4">
                          <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                               <th className="px-6 pb-2 text-left">Fecha Transacción</th>
                               <th className="px-6 pb-2 text-left">Descripción / Referencia</th>
                               <th className="px-6 pb-2 text-right">Importe Ingresado</th>
                               <th className="px-6 pb-2 text-left">Forma Cobro</th>
                               <th className="px-6 pb-2 text-right">Caja Destino</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cliente.cobranzas.map((c) => (
                              <tr key={c.id}>
                                <td className="px-6 py-5 bg-gray-50 rounded-l-2xl border-y-2 border-l-2 border-gray-100 font-bold text-xs text-gray-400 italic">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                                <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 font-bold text-xs text-gray-900 uppercase italic">
                                   {c.descripcion || (c.presupuesto ? `PAGO COTIZACIÓN #${c.presupuesto.numero}` : "COBRO MISCELÁNEO")}
                                </td>
                                <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100 text-right font-black text-base italic tracking-tight text-emerald-600">${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-5 bg-gray-50 border-y-2 border-gray-100">
                                   <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">{c.formaPago}</span>
                                </td>
                                <td className="px-6 py-5 bg-gray-50 rounded-r-2xl border-y-2 border-r-2 border-gray-100 text-right font-black text-[10px] text-red-600 uppercase tracking-widest italic">{c.caja?.nombre || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                     {cliente.cobranzas.length === 0 && (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                           <Receipt size={64} />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin ingresos registrados</p>
                        </div>
                     )}
                  </div>
                )}

                {/* TAB: CUENTA CORRIENTE */}
                {tab === 'cuenta' && (
                  <div className="animate-in fade-in zoom-in-95 duration-500">
                     <div className="bg-gray-900 rounded-[40px] p-12 lg:p-16 text-center space-y-12 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:scale-[1.6] transition-transform">
                           <CreditCard size={128} className="text-white" />
                        </div>
                        
                        <div className="space-y-4">
                           <h3 className="text-red-600 text-[10px] font-black uppercase tracking-[0.5em]">Estado de Liquidación Vigente</h3>
                           <p className="text-6xl font-black text-white italic tracking-tighter transition-all group-hover:scale-105">
                              ${cliente.saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                           </p>
                           <span className={`inline-block px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border-2 ${cliente.saldoPendiente > 0 ? "border-red-600 text-red-600" : "border-emerald-600 text-emerald-600 animate-pulse"}`}>
                              {cliente.saldoPendiente > 0 ? "SALDO PENDIENTE RECLAMABLE" : "SITUACIÓN CREDITICIA REGULAR"}
                           </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-2xl mx-auto pt-10 border-t border-gray-800">
                           <div className="space-y-2">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">DEBE (BRUTO)</span>
                              <p className="text-2xl font-black text-gray-400 italic tracking-tighter">${cliente.totalPresupuestado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                           </div>
                           <div className="space-y-2">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">HABER (LÍQUIDO)</span>
                              <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">${cliente.totalCobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                           </div>
                        </div>

                        <div className="pt-8">
                           <button onClick={() => router.push(`/cobranzas/nueva?clienteId=${cliente.id}`)} className="bg-red-600 text-white px-12 py-6 rounded-3xl text-xs font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/40 uppercase tracking-[0.2em] active:scale-95">REGISTRAR NUEVO COBRO INMEDIATO</button>
                        </div>
                     </div>
                  </div>
                )}

              </div>
           </div>

        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto w-full px-6 lg:px-10 py-10">
         <div className="border-t-2 border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic leading-relaxed text-center md:text-left">PROPIEDAD INTELECTUAL — SERVINOA V3.0<br/>PROTOCOLOS DE SEGURIDAD OPERATIVA ACTIVOS</p>
            <div className="flex gap-4">
               <button onClick={() => router.push(`/clientes/${id}/editar`)} className="px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all uppercase tracking-widest">EDITAR PERFIL CLIENTE</button>
            </div>
         </div>
      </footer>
    </div>
  );
}
