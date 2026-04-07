"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Presupuesto {
  id: string;
  numero: number;
  fecha: string;
  estado: string;
  estadoCobro: string;
  facturaNumero: string | null;
  total: number;
  cobrado: number;
  saldo: number;
  cliente: { nombre: string; empresa?: { nombre: string } | null };
  orden: { numero: number; id: string } | null;
}

const estadoColors: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-600",
  PRESUPUESTADO: "bg-blue-100 text-blue-700",
  APROBADO: "bg-green-100 text-green-700",
  RECHAZADO: "bg-red-100 text-red-700",
};

const cobroColors: Record<string, string> = {
  PENDIENTE: "bg-gray-100 text-gray-500",
  APROBACION_PENDIENTE: "bg-orange-100 text-orange-700",
  COBRO_PENDIENTE: "bg-yellow-100 text-yellow-700",
  COBRADO: "bg-green-100 text-green-700",
  PARCIAL: "bg-blue-100 text-blue-700",
};

const cobroLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBACION_PENDIENTE: "Aprobación pendiente",
  COBRO_PENDIENTE: "Cobro pendiente",
  COBRADO: "Cobrado",
  PARCIAL: "Parcial",
};

function formatNumero(numero: number, fecha: string) {
  const year = new Date(fecha).getFullYear();
  return `${year}-${numero.toString().padStart(5, "0")}`;
}

export default function PresupuestosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; numero: number; fecha: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorDelete, setErrorDelete] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/presupuestos")
      .then((r) => r.json())
      .then((data) => {
        setPresupuestos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const eliminarPresupuesto = async (id: string) => {
    setEliminando(true);
    setErrorDelete(null);
    const res = await fetch(`/api/presupuestos/${id}`, { method: "DELETE" });
    const data = await res.json();
    setEliminando(false);
    if (!res.ok) {
      setErrorDelete(data.error || "Error al eliminar");
      return;
    }
    setConfirmDelete(null);
    setPresupuestos((prev) => prev.filter((p) => p.id !== id));
  };

  const filtrados = presupuestos.filter((p) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      p.numero.toString().includes(texto) ||
      p.cliente?.nombre?.toLowerCase().includes(texto) ||
      p.cliente?.empresa?.nombre?.toLowerCase().includes(texto) ||
      (p.facturaNumero || "").toLowerCase().includes(texto);
    const coincideEstado = !filtroEstado || p.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Menú</button>
          <h1 className="text-xl font-bold text-gray-900">Presupuestos</h1>
        </div>
        <button
          onClick={() => router.push("/presupuestos/nuevo")}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          + Nuevo Presupuesto
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por N°, cliente, empresa, factura..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="PRESUPUESTADO">Presupuestado</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>

        <div className="text-sm text-gray-500 mb-4">{filtrados.length} presupuesto{filtrados.length !== 1 ? "s" : ""}</div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">N° Ppto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">OT</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Importe</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cobro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/presupuestos/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-green-700">{formatNumero(p.numero, p.fecha)}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(p.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3">
                    {p.cliente?.empresa?.nombre
                      ? `${p.cliente.empresa.nombre} - ${p.cliente.nombre}`
                      : p.cliente?.nombre}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.orden ? `OT-${p.orden.numero}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ${p.total?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${p.saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                    ${p.saldo?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColors[p.estado] || "bg-gray-100"}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cobroColors[p.estadoCobro] || "bg-gray-100"}`}>
                      {cobroLabel[p.estadoCobro] || p.estadoCobro}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setErrorDelete(null); setConfirmDelete({ id: p.id, numero: p.numero, fecha: p.fecha }); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No se encontraron presupuestos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar presupuesto"
        message={`¿Eliminar presupuesto ${confirmDelete ? formatNumero(confirmDelete.numero, confirmDelete.fecha) : ""}? Esta acción no se puede deshacer.`}
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => { setConfirmDelete(null); setErrorDelete(null); }}
        onConfirm={() => confirmDelete && eliminarPresupuesto(confirmDelete.id)}
      />

      {errorDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {errorDelete}
          <button onClick={() => setErrorDelete(null)} className="ml-3 underline">Cerrar</button>
        </div>
      )}
    </div>
  );
}
