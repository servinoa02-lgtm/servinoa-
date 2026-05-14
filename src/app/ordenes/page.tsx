"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Orden {
  id: string;
  numero: number;
  estado: string;
  falla: string | null;
  observaciones: string | null;
  nroSerie: string | null;
  accesorios: string | null;
  fechaRecepcion: string;
  maquina: { nombre: string } | null;
  marca: { nombre: string } | null;
  modelo: { nombre: string } | null;
  cliente: { nombre: string; empresa: { nombre: string } | null };
  tecnico: { nombre: string } | null;
  presupuestos: { id: string; numero: number; estado: string }[];
}

const ESTADOS: Record<string, { label: string; color: string }> = {
  RECIBIDO: { label: "Recibido", color: "bg-gray-100 text-gray-700" },
  PARA_REVISAR: { label: "Para revisar", color: "bg-yellow-100 text-yellow-700" },
  EN_REVISION: { label: "En revisión", color: "bg-blue-100 text-blue-700" },
  REVISADO: { label: "Revisado", color: "bg-blue-200 text-blue-800" },
  PARA_PRESUPUESTAR: { label: "Para presupuestar", color: "bg-orange-100 text-orange-700" },
  PRESUPUESTADO: { label: "Presupuestado", color: "bg-purple-100 text-purple-700" },
  APROBADO: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  EN_REPARACION: { label: "En reparación", color: "bg-green-200 text-green-800" },
  REPARADO: { label: "Reparado", color: "bg-teal-100 text-teal-700" },
  PARA_ENTREGAR: { label: "Para entregar", color: "bg-cyan-100 text-cyan-700" },
  ENTREGADO_REALIZADO: { label: "Entregada realizada", color: "bg-emerald-100 text-emerald-700" },
  ENTREGADO_SIN_REALIZAR: { label: "Entregada sin realizar", color: "bg-red-100 text-red-700" },
  RECHAZADO: { label: "Rechazado", color: "bg-red-200 text-red-800" },
};

export default function OrdenesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const [clientes, setClientes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [form, setForm] = useState({
    clienteId: "",
    tecnicoId: "",
    maquina: "",
    marca: "",
    modelo: "",
    nroSerie: "",
    falla: "",
    accesorios: "",
    observaciones: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetchOrdenes();
    fetchClientes();
    fetchTecnicos();
  }, []);

  const fetchOrdenes = async () => {
    const res = await fetch("/api/ordenes");
    const data = await res.json();
    setOrdenes(data);
    setLoading(false);
  };

  const fetchClientes = async () => {
    const res = await fetch("/api/clientes");
    if (res.ok) setClientes(await res.json());
  };

  const fetchTecnicos = async () => {
    const res = await fetch("/api/tecnicos");
    if (res.ok) setTecnicos(await res.json());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/ordenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        creadorId: (session?.user as any)?.id,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ clienteId: "", tecnicoId: "", maquina: "", marca: "", modelo: "", nroSerie: "", falla: "", accesorios: "", observaciones: "" });
      fetchOrdenes();
    }
  };

  const ordenesFiltradas = ordenes.filter((o) => {
    const matchEstado = filtroEstado === "TODOS" || o.estado === filtroEstado;
    const texto = busqueda.toLowerCase();
    const matchBusqueda =
      !texto ||
      o.numero.toString().includes(texto) ||
      o.cliente.nombre.toLowerCase().includes(texto) ||
      (o.cliente.empresa?.nombre || "").toLowerCase().includes(texto) ||
      (o.maquina?.nombre || "").toLowerCase().includes(texto) ||
      (o.falla || "").toLowerCase().includes(texto);
    return matchEstado && matchBusqueda;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">
            ← Menú
          </button>
          <h1 className="text-xl font-bold text-gray-900">Órdenes de Trabajo</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          + Nueva OT
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar por N°, cliente, equipo, falla..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none"
          >
            <option value="TODOS">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-4">{ordenesFiltradas.length} órdenes encontradas</p>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">OT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Falla</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Técnico</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map((orden) => (
                  <tr
                    key={orden.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/ordenes/${orden.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">OT-{orden.numero}</td>
                    <td className="px-4 py-3">
                      <div>{orden.cliente.empresa?.nombre || "Particular"}</div>
                      <div className="text-gray-500 text-xs">{orden.cliente.nombre}</div>
                    </td>
                    <td className="px-4 py-3">
                      {orden.maquina?.nombre || "-"}
                      {orden.marca && <span className="text-gray-500"> - {orden.marca.nombre}</span>}
                      {orden.modelo && <span className="text-gray-400"> {orden.modelo.nombre}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{orden.falla || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADOS[orden.estado]?.color || "bg-gray-100"}`}>
                        {ESTADOS[orden.estado]?.label || orden.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{orden.tecnico?.nombre || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(orden.fechaRecepcion).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
                {ordenesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No hay órdenes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Nueva Orden de Trabajo</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.empresa?.nombre || "Particular"} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                <select
                  value={form.tecnicoId}
                  onChange={(e) => setForm({ ...form, tecnicoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
                  <input
                    type="text"
                    value={form.maquina}
                    onChange={(e) => setForm({ ...form, maquina: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder="Ej: Soldadora Inverter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder="Ej: ESAB"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder="Ej: LHN 242i"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° de Serie</label>
                  <input
                    type="text"
                    value={form.nroSerie}
                    onChange={(e) => setForm({ ...form, nroSerie: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Falla</label>
                <textarea
                  value={form.falla}
                  onChange={(e) => setForm({ ...form, falla: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  rows={2}
                  placeholder="Descripción de la falla..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios incluidos</label>
                <input
                  type="text"
                  value={form.accesorios}
                  onChange={(e) => setForm({ ...form, accesorios: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  placeholder="Ej: Torcha, pinza masa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Crear Orden de Trabajo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}