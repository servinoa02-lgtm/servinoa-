"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Gasto {
  id: string;
  tipo: string;
  fecha: string;
  descripcion: string;
  importe: number;
  formaPago: string;
  comprobante?: string | null;
  empleado?: string | null;
  desde?: string | null;
  hasta?: string | null;
  usuario: { nombre: string };
  caja?: { nombre: string } | null;
  proveedor?: { nombre: string } | null;
}

interface Proveedor { id: string; nombre: string; }
interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Mercado Pago", "Otro"];

export default function GastosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Form
  const [tipo, setTipo] = useState<"GASTO_VARIOS" | "SUELDO">("GASTO_VARIOS");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [cajaId, setCajaId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [empleado, setEmpleado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/gastos").then((r) => r.json()).then((d) => { setGastos(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    fetch("/api/cajas").then((r) => r.json()).then((d) => { setCajas(d); if (d.length > 0) setCajaId(d[0].id); });
    fetch("/api/proveedores").then((r) => r.json()).then(setProveedores);
  }, []);

  const eliminarGasto = async (id: string) => {
    setEliminando(true);
    await fetch(`/api/gastos/${id}`, { method: "DELETE" });
    setEliminando(false);
    setConfirmDelete(null);
    cargar();
  };

  const guardar = async () => {
    if (!importe || !cajaId) return;
    if (tipo === "GASTO_VARIOS" && !descripcion) return;
    if (tipo === "SUELDO" && !empleado) return;
    setGuardando(true);

    await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        descripcion: tipo === "SUELDO" ? `Sueldo ${empleado}` : descripcion,
        importe,
        formaPago,
        cajaId,
        usuarioId: (session?.user as { id?: string })?.id,
        proveedorId: proveedorId || null,
        comprobante: comprobante || null,
        empleado: tipo === "SUELDO" ? empleado : null,
        desde: desde || null,
        hasta: hasta || null,
      }),
    });

    setMostrarForm(false);
    setImporte(""); setDescripcion(""); setComprobante(""); setEmpleado(""); setDesde(""); setHasta(""); setProveedorId("");
    setGuardando(false);
    cargar();
  };

  const totalDelMes = () => {
    const ahora = new Date();
    return gastos
      .filter((g) => {
        const f = new Date(g.fecha);
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((sum, g) => sum + g.importe, 0);
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Menú</button>
          <h1 className="text-xl font-bold text-gray-900">Gastos</h1>
          <span className="text-sm text-gray-500">Este mes: <strong className="text-red-600">${totalDelMes().toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></span>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          + Nuevo Gasto
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Importe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Forma de pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Caja</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Registrado por</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(g.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.tipo === "SUELDO" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                      {g.tipo === "SUELDO" ? "Sueldo" : "Gasto"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {g.descripcion}
                    {g.proveedor && <span className="text-xs text-gray-400 ml-1">({g.proveedor.nombre})</span>}
                    {g.desde && g.hasta && (
                      <span className="text-xs text-gray-400 ml-1">
                        {new Date(g.desde).toLocaleDateString("es-AR")} - {new Date(g.hasta).toLocaleDateString("es-AR")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    ${g.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{g.formaPago}</td>
                  <td className="px-4 py-3 text-gray-500">{g.caja?.nombre || "-"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{g.usuario?.nombre}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete(g.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay gastos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Panel lateral nuevo gasto */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMostrarForm(false)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nuevo Gasto / Pago</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                {(["GASTO_VARIOS", "SUELDO"] as const).map((t) => (
                  <button key={t} onClick={() => setTipo(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${tipo === t ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-500"}`}>
                    {t === "SUELDO" ? "Sueldo" : "Gastos Varios"}
                  </button>
                ))}
              </div>

              {tipo === "GASTO_VARIOS" ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Proveedor (opcional)</label>
                    <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                      <option value="">Sin proveedor</option>
                      {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Descripción *</label>
                    <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Descripción del gasto..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">N° Comprobante</label>
                    <input type="text" value={comprobante} onChange={(e) => setComprobante(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Empleado *</label>
                    <input type="text" value={empleado} onChange={(e) => setEmpleado(e.target.value)}
                      placeholder="Nombre del empleado..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Desde</label>
                      <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                      <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-1">Importe *</label>
                <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Forma de pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Caja *</label>
                <select value={cajaId} onChange={(e) => setCajaId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="">Seleccionar caja...</option>
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={guardar}
                disabled={guardando || !importe || !cajaId}
                className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Registrar Gasto"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar gasto"
        message="¿Estás seguro? El movimiento de caja asociado también será eliminado. Esta acción no se puede deshacer."
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarGasto(confirmDelete)}
      />
    </div>
  );
}
