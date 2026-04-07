"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Cheque {
  id: string;
  estado: string;
  numeroCheque?: string | null;
  banco?: string | null;
  librador?: string | null;
  importe: number;
  fechaIngreso: string;
  fechaEmision?: string | null;
  fechaCobro?: string | null;
  endosadoA?: string | null;
  descripcion?: string | null;
  diasVencimiento?: number | null;
  vencimientoTexto?: string;
  cliente?: { nombre: string; empresa?: { nombre: string } | null } | null;
}

interface Cliente { id: string; nombre: string; empresa?: { nombre: string } | null; }

const estadoColors: Record<string, string> = {
  EN_CARTERA: "bg-blue-100 text-blue-700",
  DEPOSITADO: "bg-green-100 text-green-700",
  ENDOSADO: "bg-purple-100 text-purple-700",
  COBRADO: "bg-gray-100 text-gray-600",
  RECHAZADO: "bg-red-100 text-red-700",
  VENCIDO: "bg-orange-100 text-orange-700",
};

export default function ChequesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");

  // Form
  const [clienteId, setClienteId] = useState("");
  const [numeroCheque, setNumeroCheque] = useState("");
  const [banco, setBanco] = useState("");
  const [librador, setLibrador] = useState("");
  const [importe, setImporte] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaCobro, setFechaCobro] = useState("");
  const [endosadoA, setEndosadoA] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estadoForm, setEstadoForm] = useState("EN_CARTERA");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/cheques").then((r) => r.json()).then((d) => { setCheques(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
  }, []);

  const filtrados = cheques.filter((c) => {
    const texto = busqueda.toLowerCase();
    return (
      (c.numeroCheque || "").includes(texto) ||
      (c.librador || "").toLowerCase().includes(texto) ||
      (c.banco || "").toLowerCase().includes(texto) ||
      (c.cliente?.nombre || "").toLowerCase().includes(texto)
    );
  });

  const guardar = async () => {
    if (!importe) return;
    setGuardando(true);
    await fetch("/api/cheques", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId: clienteId || null, numeroCheque, banco, librador, importe, fechaEmision, fechaCobro, endosadoA, descripcion, estado: estadoForm }),
    });
    setMostrarForm(false);
    setNumeroCheque(""); setBanco(""); setLibrador(""); setImporte(""); setFechaEmision(""); setFechaCobro(""); setEndosadoA(""); setDescripcion(""); setClienteId("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  const totalCartera = cheques
    .filter((c) => c.estado === "EN_CARTERA")
    .reduce((sum, c) => sum + c.importe, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/cajas")} className="text-gray-500 hover:text-gray-700">← Cajas</button>
          <h1 className="text-xl font-bold text-gray-900">Cheques</h1>
          <span className="text-sm text-gray-500">En cartera: <strong className="text-yellow-700">${totalCartera.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></span>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
        >
          + Nuevo Cheque
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <input
          type="text"
          placeholder="Buscar por N° cheque, librador, banco, cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
        />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Librador</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">N° Cheque</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Banco</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">F. Ingreso</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">F. Cobro</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Importe</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3 text-gray-600">
                    {c.cliente?.empresa?.nombre
                      ? `${c.cliente.empresa.nombre} - ${c.cliente.nombre}`
                      : c.cliente?.nombre || "-"}
                  </td>
                  <td className="px-3 py-3">{c.librador || "-"}</td>
                  <td className="px-3 py-3 font-medium">{c.numeroCheque || "-"}</td>
                  <td className="px-3 py-3 text-gray-500">{c.banco || "-"}</td>
                  <td className="px-3 py-3 text-gray-500">{new Date(c.fechaIngreso).toLocaleDateString("es-AR")}</td>
                  <td className="px-3 py-3 text-gray-500">{c.fechaCobro ? new Date(c.fechaCobro).toLocaleDateString("es-AR") : "-"}</td>
                  <td className="px-3 py-3 text-right font-semibold">${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[c.estado] || "bg-gray-100"}`}>
                      {c.estado.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-xs font-medium ${c.diasVencimiento !== null && c.diasVencimiento !== undefined && c.diasVencimiento < 0 ? "text-red-600" : c.diasVencimiento !== null && c.diasVencimiento !== undefined && c.diasVencimiento <= 7 ? "text-orange-600" : "text-gray-500"}`}>
                    {c.vencimientoTexto || "-"}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No hay cheques</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Panel lateral nuevo cheque */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMostrarForm(false)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nuevo Cheque</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Cliente (opcional)</label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="">Sin cliente</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}` : c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Librador</label>
                <input type="text" value={librador} onChange={(e) => setLibrador(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">N° de Cheque</label>
                  <input type="text" value={numeroCheque} onChange={(e) => setNumeroCheque(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Banco</label>
                  <input type="text" value={banco} onChange={(e) => setBanco(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Importe *</label>
                <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fecha Emisión</label>
                  <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fecha Cobro</label>
                  <input type="date" value={fechaCobro} onChange={(e) => setFechaCobro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Endosado a</label>
                <input type="text" value={endosadoA} onChange={(e) => setEndosadoA(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Estado</label>
                <select value={estadoForm} onChange={(e) => setEstadoForm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="EN_CARTERA">En Cartera</option>
                  <option value="DEPOSITADO">Depositado</option>
                  <option value="ENDOSADO">Endosado</option>
                  <option value="COBRADO">Cobrado</option>
                  <option value="RECHAZADO">Rechazado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button onClick={guardar} disabled={guardando || !importe}
                className="w-full bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar Cheque"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
