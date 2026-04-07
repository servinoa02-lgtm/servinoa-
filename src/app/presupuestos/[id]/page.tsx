"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Receipt, User, Wrench, CreditCard, Printer, Save, Trash2, CheckCircle2, XCircle, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

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
      alert("Se requiere al menos un ítem con descripción.");
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
      alert("Error al actualizar la cotización.");
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
      <div className="flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando cotización...</div>
      </div>
    );
  }

  if (!ppto || (ppto as { error?: string }).error) {
    return <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">Presupuesto no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/presupuestos" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Presupuesto</p>
                <StatusBadge status={ppto.estado} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">#{formatNumero(ppto.numero, ppto.fecha)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right border-r border-gray-200 pr-4 mr-2 hidden md:block">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
               <p className="text-xl font-bold text-red-600">${ppto.total.toLocaleString("es-AR")}</p>
            </div>
            <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md flex items-center gap-2 uppercase tracking-wider">
              <Printer size={18} /> Imprimir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full space-y-8">
        
        {ppto.estado === "PRESUPUESTADO" && (
          <section className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-bold text-lg">?</div>
               <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase">Validación del Cliente</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esperando confirmación para proceder</p>
               </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <button onClick={() => cambiarEstado("APROBADO")} disabled={actualizando} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Aprobar
               </button>
               <button onClick={() => cambiarEstado("RECHAZADO")} disabled={actualizando} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold hover:bg-red-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                  <XCircle size={16} /> Rechazar
               </button>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                   <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-red-600" /> Cliente</h2>
                   <Link href={`/clientes/${ppto.cliente.id}`} className="text-[9px] font-bold text-red-600 uppercase">Ver ficha</Link>
                </div>
                <div className="p-6">
                   <p className="text-base font-bold text-gray-900 uppercase leading-tight">
                      {ppto.cliente?.empresa?.nombre ? ppto.cliente.empresa.nombre : ppto.cliente?.nombre}
                   </p>
                   {ppto.cliente?.empresa && <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Ref: {ppto.cliente.nombre}</p>}
                   
                   <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-gray-400 uppercase">Moneda</span>
                         <span className="text-gray-900 uppercase">{ppto.moneda}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-gray-400 uppercase">Pago</span>
                         <span className="text-gray-900 uppercase">{ppto.formaPago}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-gray-400 uppercase">Vencimiento</span>
                         <span className="text-gray-900 uppercase">{ppto.validezDias} días</span>
                      </div>
                   </div>
                </div>
             </div>

             {ppto.orden && (
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Wrench size={14} className="text-red-600" /> Orden Asociada</h2>
                      <Link href={`/ordenes/${ppto.orden.id}`} className="text-[9px] font-bold text-red-600 uppercase">#OT-{ppto.orden.numero}</Link>
                  </div>
                  <div className="p-6">
                     <p className="text-xs font-bold text-gray-900 uppercase">
                        {[ppto.orden.maquina?.nombre, ppto.orden.marca?.nombre, ppto.orden.modelo?.nombre].filter(Boolean).join(" - ")}
                     </p>
                     {ppto.orden.nroSerie && (
                       <p className="text-[10px] font-mono font-bold text-red-600 mt-2">S/N: {ppto.orden.nroSerie}</p>
                     )}
                  </div>
               </div>
             )}

             <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-4 shadow-md">
                <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Resumen Financiero</p>
                <div className="space-y-3">
                   <div className="flex justify-between text-xs border-b border-gray-800 pb-2">
                      <span className="text-gray-500 uppercase">Importe</span>
                      <span className="font-bold">${ppto.total.toLocaleString("es-AR")}</span>
                   </div>
                   <div className="flex justify-between text-xs border-b border-gray-800 pb-2">
                      <span className="text-emerald-500 uppercase">Cobrado</span>
                      <span className="font-bold text-emerald-500">${ppto.cobrado.toLocaleString("es-AR")}</span>
                   </div>
                   <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Saldo</span>
                      <span className={`text-2xl font-bold ${ppto.saldo > 0 ? "text-red-600" : "text-emerald-500"}`}>
                         ${ppto.saldo.toLocaleString("es-AR")}
                      </span>
                   </div>
                </div>
                {ppto.estado === "APROBADO" && ppto.saldo > 0 && (
                  <button onClick={() => router.push(`/cobranzas/nueva?presupuestoId=${ppto.id}`)} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all uppercase tracking-widest">
                     Registrar Pago
                  </button>
                )}
             </div>
          </aside>

          <div className="lg:col-span-8">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                   <h2 className="text-sm font-bold text-gray-900 uppercase">Planilla de Ítems</h2>
                   {ppto.estado !== "APROBADO" && ppto.estado !== "RECHAZADO" && !modoEdicion && (
                     <button onClick={() => setModoEdicion(true)} className="text-[10px] font-bold text-gray-900 border border-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-900 hover:text-white transition-all flex items-center gap-2 uppercase tracking-tight">
                        <FileText size={14}/> Editar items
                     </button>
                   )}
                </div>

                <div className="p-8 flex-1">
                   {!modoEdicion ? (
                     <div className="space-y-6">
                       <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                               <th className="px-4 pb-2">Cant.</th>
                               <th className="px-4 pb-2">Descripción</th>
                               <th className="px-4 pb-2 text-right">Unitario</th>
                               <th className="px-4 pb-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ppto.items.map((item) => (
                              <tr key={item.id} className="bg-gray-50/50">
                                <td className="px-4 py-3 rounded-l-xl text-xs font-bold text-gray-900">{item.cantidad}</td>
                                <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase italic">{item.descripcion}</td>
                                <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-400">${item.precio.toLocaleString("es-AR")}</td>
                                <td className="px-4 py-3 rounded-r-xl text-right text-xs font-bold text-red-600">${item.total.toLocaleString("es-AR")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                       </div>

                       <div className="mt-8 bg-gray-50 rounded-2xl p-6 space-y-3">
                          {ppto.incluyeIva && (
                             <div className="flex justify-between text-[10px] font-bold text-gray-400 border-b border-gray-200 pb-2">
                                <span className="uppercase">Subtotal neto ({ppto.moneda})</span>
                                <span>${(ppto.total / 1.21).toLocaleString("es-AR")}</span>
                             </div>
                          )}
                          <div className="flex justify-between items-center pt-2">
                             <span className="text-[10px] font-bold text-gray-900 uppercase">Total {ppto.incluyeIva ? "(IVA inc.)" : ""}</span>
                             <span className="text-3xl font-bold text-gray-900 tracking-tight">${ppto.total.toLocaleString("es-AR")}</span>
                          </div>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                        {editItems.map((item, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 p-5 rounded-2xl relative group shadow-sm flex flex-col gap-4">
                             <button onClick={() => editItems.length > 1 && setEditItems(editItems.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-gray-300 hover:text-red-600 transition-all"><Trash2 size={18}/></button>
                             <input type="text" value={item.descripcion} onChange={e => { const n = [...editItems]; n[idx].descripcion = e.target.value.toUpperCase(); setEditItems(n); }} 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold italic outline-none focus:border-red-600 focus:bg-white transition-all uppercase" placeholder="DESCRIPCIÓN DEL ÍTEM..." />
                             <div className="grid grid-cols-2 gap-4">
                                <input type="number" min="1" value={item.cantidad || ""} onChange={e => { const n = [...editItems]; n[idx].cantidad = parseFloat(e.target.value) || 0; setEditItems(n); }} 
                                       className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-red-600 focus:bg-white" placeholder="Cant." />
                                <input type="number" min="0" value={item.precio || ""} onChange={e => { const n = [...editItems]; n[idx].precio = parseFloat(e.target.value) || 0; setEditItems(n); }} 
                                       className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-red-600 focus:bg-white" placeholder="Precio unit." />
                             </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-6">
                           <button onClick={() => setEditItems([...editItems, { cantidad: 1, descripcion: "", precio: 0 }])} className="text-[10px] font-bold text-gray-900 uppercase border border-gray-900 px-4 py-2 rounded-xl hover:bg-gray-900 hover:text-white transition-all flex items-center gap-2">
                              <Plus size={16}/> Nuevo ítem
                           </button>
                           <div className="flex gap-2">
                              <button onClick={() => setModoEdicion(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-400 uppercase">Cancelar</button>
                              <button onClick={guardarEdicionItems} disabled={actualizando} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-bold hover:bg-red-700 transition-all uppercase tracking-widest flex items-center gap-2">
                                 <Save size={16}/> Guardar
                              </button>
                           </div>
                        </div>
                     </div>
                   )}

                   {ppto.observaciones && (
                      <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl text-xs italic font-bold text-red-900 uppercase">
                          <span className="text-[9px] font-bold text-red-600 uppercase block mb-1">Observaciones:</span>
                          {ppto.observaciones}
                      </div>
                   )}

                   <div className="mt-12 space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-900 uppercase">Historial de Cobros</h3>
                      {ppto.cobranzas?.length > 0 ? (
                        <div className="space-y-2">
                          {ppto.cobranzas.map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400">{new Date(c.fecha).toLocaleDateString("es-AR")} — {c.formaPago}</span>
                              <span className="text-xs font-bold text-emerald-600">${c.importe.toLocaleString("es-AR")}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] italic text-gray-400 py-4 border border-dashed border-gray-200 rounded-xl text-center">Sin registros de pago</p>
                      )}
                   </div>
                </div>
                <div className="p-8 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">ServiNOA © {new Date().getFullYear()}</p>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
