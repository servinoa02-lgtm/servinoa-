"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  RECIBIDO: "bg-gray-100 text-gray-700",
  PARA_REVISAR: "bg-yellow-100 text-yellow-700",
  EN_REVISION: "bg-blue-100 text-blue-700",
  REVISADO: "bg-orange-100 text-orange-700",
  PARA_PRESUPUESTAR: "bg-red-100 text-red-700",
  PRESUPUESTADO: "bg-purple-100 text-purple-700",
  APROBADO: "bg-green-100 text-green-700",
  EN_REPARACION: "bg-blue-200 text-blue-800",
  REPARADO: "bg-teal-100 text-teal-700",
  PARA_ENTREGAR: "bg-cyan-100 text-cyan-700",
  ENTREGADO_REALIZADO: "bg-green-200 text-green-800",
  ENTREGADO_SIN_REALIZAR: "bg-orange-200 text-orange-800",
  RECHAZADO: "bg-red-200 text-red-800",
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
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  if (!cliente || (cliente as { error?: string }).error) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">Cliente no encontrado</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/clientes")} className="text-gray-500 hover:text-gray-700">← Clientes</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cliente.nombre}</h1>
            {cliente.empresa && <p className="text-sm text-gray-500">{cliente.empresa.nombre}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Saldo pendiente</p>
          <p className={`text-lg font-bold ${cliente.saldoPendiente > 0 ? "text-red-600" : "text-green-600"}`}>
            ${cliente.saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Datos del cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Datos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {cliente.dni && (
              <div>
                <span className="text-gray-500 block">DNI / CUIT</span>
                <span className="font-medium">{cliente.dni}</span>
              </div>
            )}
            {cliente.telefono && (
              <div>
                <span className="text-gray-500 block">Teléfono / WhatsApp</span>
                <div className="flex items-center gap-2 mt-1">
                  <a href={`tel:${cliente.telefono}`} className="font-medium text-slate-800 hover:text-indigo-600">{cliente.telefono}</a>
                  <a href={`https://wa.me/${cliente.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-200 transition-colors">WhatsApp</a>
                </div>
              </div>
            )}
            {cliente.email && (
              <div>
                <span className="text-gray-500 block">Email</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{cliente.email}</span>
                  <a href={`mailto:${cliente.email}`} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-blue-200 transition-colors">Enviar Correo</a>
                </div>
              </div>
            )}
            {cliente.domicilio && (
              <div>
                <span className="text-gray-500 block">Domicilio</span>
                <span className="font-medium">{cliente.domicilio}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 block">Condición IVA</span>
              <span className="font-medium">{cliente.iva}</span>
            </div>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Presupuestado</p>
            <p className="text-lg font-bold text-blue-700">${cliente.totalPresupuestado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Cobrado</p>
            <p className="text-lg font-bold text-green-700">${cliente.totalCobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Saldo Pendiente</p>
            <p className={`text-lg font-bold ${cliente.saldoPendiente > 0 ? "text-red-600" : "text-green-600"}`}>
              ${cliente.saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(["ots", "pptos", "cobranzas", "cuenta"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {t === "ots" ? `OTs (${cliente.ordenes.length})` :
                 t === "pptos" ? `Presupuestos (${cliente.presupuestos.length})` :
                 t === "cobranzas" ? `Cobranzas (${cliente.cobranzas.length})` :
                 "Cuenta Corriente"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* OTs */}
            {tab === "ots" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-100">
                    <th className="text-left pb-2">OTN</th>
                    <th className="text-left pb-2">Equipo</th>
                    <th className="text-left pb-2">Estado</th>
                    <th className="text-left pb-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.ordenes.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/ordenes/${o.id}`)}>
                      <td className="py-2 font-medium">OT-{o.numero}</td>
                      <td className="py-2 text-gray-600">{[o.maquina?.nombre, o.marca?.nombre, o.modelo?.nombre].filter(Boolean).join(" ") || "-"}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${estadoOTColors[o.estado] || "bg-gray-100"}`}>
                          {o.estado.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{new Date(o.fechaRecepcion).toLocaleDateString("es-AR")}</td>
                    </tr>
                  ))}
                  {cliente.ordenes.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-sm">Sin órdenes</td></tr>}
                </tbody>
              </table>
            )}

            {/* Presupuestos */}
            {tab === "pptos" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-100">
                    <th className="text-left pb-2">N° Ppto</th>
                    <th className="text-left pb-2">OT</th>
                    <th className="text-right pb-2">Total</th>
                    <th className="text-right pb-2">Saldo</th>
                    <th className="text-left pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.presupuestos.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/presupuestos/${p.id}`)}>
                      <td className="py-2 font-medium text-green-700">{formatNumero(p.numero, p.fecha)}</td>
                      <td className="py-2 text-gray-500">{p.orden ? `OT-${p.orden.numero}` : "-"}</td>
                      <td className="py-2 text-right">${p.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                      <td className={`py-2 text-right font-medium ${p.saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                        ${p.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${p.estado === "APROBADO" ? "bg-green-100 text-green-700" : p.estado === "RECHAZADO" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cliente.presupuestos.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-sm">Sin presupuestos</td></tr>}
                </tbody>
              </table>
            )}

            {/* Cobranzas */}
            {tab === "cobranzas" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-100">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Descripción</th>
                    <th className="text-right pb-2">Importe</th>
                    <th className="text-left pb-2">Forma de pago</th>
                    <th className="text-left pb-2">Caja</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.cobranzas.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                      <td className="py-2 text-gray-600">{c.descripcion || (c.presupuesto ? `Ppto N°${c.presupuesto.numero}` : "Cobro varios")}</td>
                      <td className="py-2 text-right font-medium text-green-700">${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-gray-500">{c.formaPago}</td>
                      <td className="py-2 text-gray-500">{c.caja?.nombre || "-"}</td>
                    </tr>
                  ))}
                  {cliente.cobranzas.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-sm">Sin cobranzas</td></tr>}
                </tbody>
              </table>
            )}

            {/* Cuenta Corriente */}
            {tab === "cuenta" && (
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-100">
                      <th className="text-right pb-2">Debe (presupuestado)</th>
                      <th className="text-right pb-2">Haber (cobrado)</th>
                      <th className="text-right pb-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 text-right text-lg font-bold text-red-600">${cliente.totalPresupuestado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right text-lg font-bold text-green-600">${cliente.totalCobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                      <td className={`py-3 text-right text-lg font-bold ${cliente.saldoPendiente > 0 ? "text-red-600" : "text-green-600"}`}>
                        ${cliente.saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
