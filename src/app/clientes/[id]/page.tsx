"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, FileText, Receipt, History, Printer, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFecha } from "@/lib/dateUtils";

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
      <div className="flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando perfil de cliente...</div>
      </div>
    );
  }

  if (!cliente || (cliente as { error?: string }).error) {
    return <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">Cliente no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/clientes" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ficha de Cliente</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">{cliente.nombre}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right border-r border-gray-200 pr-4 mr-2 hidden md:block">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Saldo Actual</p>
                <p className={`text-xl font-bold ${cliente.saldoPendiente > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ${cliente.saldoPendiente.toLocaleString("es-AR")}
                </p>
             </div>
             <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md flex items-center gap-2 uppercase tracking-wider">
               <Printer size={18} /> Imprimir
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <aside className="lg:col-span-4 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                   <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-red-600" /> Información General</h2>
                </div>
                <div className="p-6 space-y-6">
                   {cliente.empresa && (
                     <div className="pb-4 border-b border-gray-50">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Empresa</label>
                        <p className="text-base font-bold text-gray-900 uppercase">{cliente.empresa.nombre}</p>
                        {cliente.empresa.cuit && <p className="text-[10px] font-bold text-red-600 font-mono mt-1">CUIT: {cliente.empresa.cuit}</p>}
                     </div>
                   )}
                   
                   <div className="space-y-4">
                      <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">DNI / Identificación</label>
                          <p className="text-sm font-bold text-gray-900">{cliente.dni || "No registrado"}</p>
                      </div>
                      <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Domicilio</label>
                          <p className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase italic"><MapPin size={14} className="text-gray-400"/> {cliente.domicilio || "No registrado"}</p>
                      </div>
                      <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Condición IVA</label>
                          <span className="inline-block px-2 py-1 bg-gray-100 rounded text-[9px] font-bold uppercase text-gray-600 border border-gray-200">{cliente.iva}</span>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-gray-50 space-y-3">
                      {cliente.telefono && (
                        <a href={`https://wa.me/${cliente.telefono.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all">
                           <Phone size={18} />
                           <span className="text-xs font-bold">{cliente.telefono}</span>
                        </a>
                      )}

                      {cliente.email && (
                        <a href={`mailto:${cliente.email}`} className="flex items-center gap-3 p-3 bg-gray-50 text-gray-700 rounded-xl border border-gray-100 hover:bg-white hover:border-red-200 transition-all">
                           <Mail size={18} />
                           <span className="text-xs font-bold lowercase truncate">{cliente.email}</span>
                        </a>
                      )}
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-50">
                <div className="p-6">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total histórico</span>
                      <History size={14} className="text-gray-200" />
                   </div>
                   <p className="text-xl font-bold text-gray-900">${cliente.totalPresupuestado.toLocaleString("es-AR")}</p>
                </div>
                <div className="p-6">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Abonado</span>
                      <CreditCard size={14} className="text-emerald-200" />
                   </div>
                   <p className="text-xl font-bold text-emerald-600">${cliente.totalCobrado.toLocaleString("es-AR")}</p>
                </div>
             </div>
          </aside>

          <div className="lg:col-span-8">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="flex border-b border-gray-100 bg-gray-50/30 overflow-x-auto">
                {[
                  { id: 'ots', label: 'Ordenes', count: cliente.ordenes.length },
                  { id: 'pptos', label: 'Presupuestos', count: cliente.presupuestos.length },
                  { id: 'cobranzas', label: 'Cobranzas', count: cliente.cobranzas.length },
                  { id: 'cuenta', label: 'Estado de Cuenta' }
                ].map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setTab(t.id as any)} 
                    className={`flex-1 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                      tab === t.id ? 'text-red-600 bg-white' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                       {t.label}
                       {t.count !== undefined && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>}
                    </div>
                    {tab === t.id && <span className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />}
                  </button>
                ))}
                </div>

                <div className="p-8 flex-1">
                  {tab === 'ots' && (
                    <div className="animate-in fade-in space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                               <th className="px-4 pb-2">OT #</th>
                               <th className="px-4 pb-2">Equipo</th>
                               <th className="px-4 pb-2">Estado</th>
                               <th className="px-4 pb-2 text-right">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cliente.ordenes.map((o) => (
                              <tr key={o.id} onClick={() => router.push(`/ordenes/${o.id}`)} className="bg-gray-50/50 hover:bg-white border border-transparent hover:border-red-200 transition-all cursor-pointer">
                                <td className="px-4 py-3 rounded-l-xl text-xs font-bold text-gray-900 italic">#{o.numero}</td>
                                <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase italic truncate max-w-[200px]">
                                   {[o.maquina?.nombre, o.marca?.nombre, o.modelo?.nombre].filter(Boolean).join(" - ")}
                                </td>
                                <td className="px-4 py-3">
                                   <StatusBadge status={o.estado} />
                                </td>
                                <td className="px-4 py-3 rounded-r-xl text-right text-[10px] font-bold text-gray-400">
                                   {formatFecha(o.fechaRecepcion)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {cliente.ordenes.length === 0 && <p className="text-center py-10 text-[10px] text-gray-400 uppercase italic font-bold">Sin actividad operativa</p>}
                    </div>
                  )}

                  {tab === 'pptos' && (
                    <div className="animate-in fade-in space-y-4">
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                 <th className="px-4 pb-2">Nro</th>
                                 <th className="px-4 pb-2 text-right">Total</th>
                                 <th className="px-4 pb-2 text-right">Saldo</th>
                                 <th className="px-4 pb-2 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cliente.presupuestos.map((p) => (
                                <tr key={p.id} onClick={() => router.push(`/presupuestos/${p.id}`)} className="bg-gray-50/50 hover:bg-white border border-transparent hover:border-red-200 transition-all cursor-pointer">
                                  <td className="px-4 py-3 rounded-l-xl text-xs font-bold text-red-600 italic uppercase">#{formatNumero(p.numero, p.fecha)}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">${p.total.toLocaleString("es-AR")}</td>
                                  <td className={`px-4 py-3 text-right text-xs font-bold ${p.saldo > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                     ${p.saldo.toLocaleString("es-AR")}
                                  </td>
                                  <td className="px-4 py-3 rounded-r-xl text-center">
                                     <StatusBadge status={p.estado} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                       </div>
                       {cliente.presupuestos.length === 0 && <p className="text-center py-10 text-[10px] text-gray-400 uppercase italic font-bold">Sin cotizaciones</p>}
                    </div>
                  )}

                  {tab === 'cobranzas' && (
                    <div className="animate-in fade-in space-y-4">
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                 <th className="px-4 pb-2">Fecha</th>
                                 <th className="px-4 pb-2">Referencia</th>
                                 <th className="px-4 pb-2 text-right">Importe</th>
                                 <th className="px-4 pb-2 text-right">Caja</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cliente.cobranzas.map((c) => (
                                <tr key={c.id}>
                                  <td className="px-4 py-3 rounded-l-xl text-[10px] font-bold text-gray-400 uppercase">{formatFecha(c.fecha)}</td>
                                  <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase italic truncate max-w-[200px]">
                                     {c.descripcion || (c.presupuesto ? `PQ #${c.presupuesto.numero}` : "Cobro vario")}
                                  </td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">${c.importe.toLocaleString("es-AR")}</td>
                                  <td className="px-4 py-3 rounded-r-xl text-right text-[10px] font-bold text-gray-400 uppercase italic">{c.caja?.nombre || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                       </div>
                       {cliente.cobranzas.length === 0 && <p className="text-center py-10 text-[10px] text-gray-400 uppercase italic font-bold">Sin cobros registrados</p>}
                    </div>
                  )}

                  {tab === 'cuenta' && (
                    <div className="animate-in fade-in zoom-in-95">
                       <div className="bg-gray-900 rounded-3xl p-10 lg:p-12 text-center space-y-8 shadow-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12">
                             <CreditCard size={128} className="text-white" />
                          </div>
                          <div className="space-y-2">
                             <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest">Estado Consolidado</p>
                             <p className="text-5xl font-bold text-white tracking-tight">
                                ${cliente.saldoPendiente.toLocaleString("es-AR")}
                             </p>
                             <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${cliente.saldoPendiente > 0 ? "border-red-600/50 text-red-600" : "border-emerald-600/50 text-emerald-600"}`}>
                                {cliente.saldoPendiente > 0 ? "Saldo deudor pendiente" : "Cuentas al día"}
                             </span>
                          </div>
                          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto pt-8 border-t border-gray-800">
                             <div>
                                <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Total Facturación</span>
                                <p className="text-lg font-bold text-white italic">${cliente.totalPresupuestado.toLocaleString("es-AR")}</p>
                             </div>
                             <div>
                                <span className="text-[9px] font-bold text-emerald-600 uppercase block mb-1">Total Cobros</span>
                                <p className="text-lg font-bold text-emerald-600 italic">${cliente.totalCobrado.toLocaleString("es-AR")}</p>
                             </div>
                          </div>
                          <div className="pt-6">
                             <button onClick={() => router.push(`/cobranzas/nueva?clienteId=${cliente.id}`)} className="bg-red-600 text-white px-8 py-3 rounded-2xl text-[10px] font-bold hover:bg-red-700 transition-all uppercase tracking-widest shadow-lg shadow-red-600/30">Registrar Cobro</button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto w-full px-6 py-10">
         <div className="border-t border-gray-200 pt-8 flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">ServiNOA © {new Date().getFullYear()}</p>
            <button onClick={() => router.push(`/clientes/${id}/editar`)} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-500 hover:text-red-600 hover:border-red-600 transition-all uppercase tracking-widest">Editar Perfil</button>
         </div>
      </footer>
    </div>
  );
}
