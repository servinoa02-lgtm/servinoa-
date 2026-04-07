"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  BORRADOR: "bg-gray-100 text-gray-600",
  PRESUPUESTADO: "bg-blue-100 text-blue-700",
  APROBADO: "bg-green-100 text-green-700",
  RECHAZADO: "bg-red-100 text-red-700",
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
      alert("Debes agregar al menos un ítem con descripción válida.");
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
      // Reload ppto
      const dRes = await fetch(`/api/presupuestos/${id}`);
      const data = await dRes.json();
      setPpto(data);
      setEditItems(data.items.map((i: any) => ({ ...i, precio: i.precio, cantidad: i.cantidad })));
    } else {
      alert("Error al actualizar los ítems.");
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
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  if (!ppto || (ppto as { error?: string }).error) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">Presupuesto no encontrado</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/presupuestos")} className="text-gray-500 hover:text-gray-700">← Presupuestos</button>
          <h1 className="text-xl font-bold text-gray-900">Ppto {formatNumero(ppto.numero, ppto.fecha)}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[ppto.estado] || "bg-gray-100"}`}>
            {ppto.estado}
          </span>
        </div>
        <div className="flex gap-2">
          {ppto.orden && (
            <button
              onClick={() => router.push(`/ordenes/${ppto.orden!.id}`)}
              className="text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100"
            >
              Ver OT-{ppto.orden.numero}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Acciones de estado */}
        {ppto.estado === "PRESUPUESTADO" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Decisión del Cliente</h2>
            <div className="flex gap-3">
              <button
                onClick={() => cambiarEstado("APROBADO")}
                disabled={actualizando}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Aprobar Presupuesto
              </button>
              <button
                onClick={() => cambiarEstado("RECHAZADO")}
                disabled={actualizando}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                ✗ Rechazar Presupuesto
              </button>
            </div>
          </div>
        )}

        {/* Info principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Datos del Cliente</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">
                  {ppto.cliente?.empresa?.nombre
                    ? `${ppto.cliente.empresa.nombre} - ${ppto.cliente.nombre}`
                    : ppto.cliente?.nombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span>{new Date(ppto.fecha).toLocaleDateString("es-AR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Forma de pago</span>
                <span>{ppto.formaPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Validez</span>
                <span>{ppto.validezDias} días</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA</span>
                <span>{ppto.incluyeIva ? "Incluye IVA" : "No incluye IVA"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Creado por</span>
                <span>{ppto.usuario?.nombre}</span>
              </div>
            </div>
          </div>

          {ppto.orden && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">OT Vinculada</h2>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">OT</span>
                  <span className="font-medium">OT-{ppto.orden.numero}</span>
                </div>
                {(ppto.orden.maquina || ppto.orden.marca || ppto.orden.modelo) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Equipo</span>
                    <span>{[ppto.orden.maquina?.nombre, ppto.orden.marca?.nombre, ppto.orden.modelo?.nombre].filter(Boolean).join(" ")}</span>
                  </div>
                )}
                {ppto.orden.nroSerie && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">N° Serie</span>
                    <span>{ppto.orden.nroSerie}</span>
                  </div>
                )}
                {ppto.orden.falla && (
                  <div>
                    <span className="text-gray-500 block mb-1">Falla</span>
                    <p className="bg-gray-50 p-2 rounded">{ppto.orden.falla}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ítems */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Ítems del Presupuesto</h2>
            {ppto.estado !== "APROBADO" && ppto.estado !== "RECHAZADO" && !modoEdicion && (
              <button 
                onClick={() => setModoEdicion(true)} 
                className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
              >
                Editar Ítems
              </button>
            )}
          </div>

          {!modoEdicion ? (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 text-gray-500 font-medium">Cant.</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Descripción</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Precio unit.</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ppto.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4">{item.cantidad}</td>
                    <td className="py-2">{item.descripcion}</td>
                    <td className="py-2 text-right">${item.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right font-medium">${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-4">
              {editItems.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-100 relative group">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción de la Tarea / Repuesto *</label>
                      <input type="text" value={item.descripcion} onChange={e => {
                        const newVal = [...editItems];
                        newVal[idx].descripcion = e.target.value;
                        setEditItems(newVal);
                      }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" placeholder="Ej: Cambio de plaqueta principal..." />
                    </div>
                    <div className="flex gap-4">
                      <div className="w-32">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                        <input type="number" min="1" value={item.cantidad || ""} onChange={e => {
                          const newVal = [...editItems];
                          newVal[idx].cantidad = parseFloat(e.target.value) || 0;
                          setEditItems(newVal);
                        }} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Precio Unitario ($)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                          <input type="number" min="0" value={item.precio || ""} onChange={e => {
                            const newVal = [...editItems];
                            newVal[idx].precio = parseFloat(e.target.value) || 0;
                            setEditItems(newVal);
                          }} className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm font-semibold text-slate-700" />
                        </div>
                      </div>
                      <div className="w-32 self-end">
                         <div className="px-4 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-center border border-indigo-100">
                           ${((item.cantidad || 0) * (item.precio || 0)).toLocaleString("es-AR")}
                         </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => {
                    if (editItems.length > 1) setEditItems(editItems.filter((_, i) => i !== idx));
                  }} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-lg border border-slate-200 shadow-sm transition-colors" title="Eliminar ítem">
                    ✗
                  </button>
                </div>
              ))}
              
              <div className="flex items-center justify-between pt-2">
                <button 
                  onClick={() => setEditItems([...editItems, { cantidad: 1, descripcion: "", precio: 0 }])}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-100/50"
                  title="Agregar Ítem"
                >
                  <span className="text-lg leading-none mt-[-2px]">+</span> Añadir Ítem
                </button>
                
                <div className="flex gap-2">
                  <button onClick={() => setModoEdicion(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg font-medium">Cancelar</button>
                  <button onClick={guardarEdicionItems} disabled={actualizando} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-indigo-700">Guardar Cambios</button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm">
            {ppto.incluyeIva && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${(ppto.total / 1.21).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA 21%</span>
                  <span>${(ppto.total - ppto.total / 1.21).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL {ppto.moneda === "ARS" ? "$ Pesos" : ppto.moneda}</span>
              <span>${ppto.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {ppto.observaciones && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm bg-gray-50 p-3 rounded">{ppto.observaciones}</p>
            </div>
          )}
        </div>

        {/* Cobranzas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Cobranzas ({ppto.cobranzas?.length || 0})</h2>
            <div className="flex gap-4 text-sm">
              <span>Total: <strong>${ppto.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></span>
              <span>Cobrado: <strong className="text-green-600">${ppto.cobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></span>
              <span>Saldo: <strong className={ppto.saldo > 0 ? "text-red-600" : "text-green-600"}>${ppto.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
          {ppto.cobranzas?.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 text-gray-500 font-medium">Fecha</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Importe</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Forma de pago</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Caja</th>
                </tr>
              </thead>
              <tbody>
                {ppto.cobranzas.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                    <td className="py-2 text-right font-medium text-green-700">${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2">{c.formaPago}</td>
                    <td className="py-2 text-gray-500">{c.caja?.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">Sin cobranzas registradas</p>
          )}
          {ppto.estado === "APROBADO" && ppto.saldo > 0 && (
            <div className="mt-4">
              <button
                onClick={() => router.push(`/cobranzas?presupuestoId=${ppto.id}`)}
                className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Registrar Cobro
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
