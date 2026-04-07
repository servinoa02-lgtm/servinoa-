"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Transferencia {
  id: string;
  fecha: string;
  monto: number;
  descripcion?: string | null;
  formaPagoOrigen: string;
  formaPagoDestino: string;
  cajaOrigen: { nombre: string };
  cajaDestino: { nombre: string };
}

interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Mercado Pago", "Otro"];

export default function TransferenciasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaOrigenId, setCajaOrigenId] = useState("");
  const [cajaDestinoId, setCajaDestinoId] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [formaPagoOrigen, setFormaPagoOrigen] = useState("Efectivo");
  const [formaPagoDestino, setFormaPagoDestino] = useState("Efectivo");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/cajas/transferencias").then((r) => r.json()).then((d) => { setTransferencias(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    fetch("/api/cajas").then((r) => r.json()).then((d) => {
      setCajas(d);
      if (d.length >= 2) { setCajaOrigenId(d[0].id); setCajaDestinoId(d[1].id); }
    });
  }, []);

  const guardar = async () => {
    if (!cajaOrigenId || !cajaDestinoId || !monto || cajaOrigenId === cajaDestinoId) return;
    setGuardando(true);

    await fetch("/api/cajas/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cajaOrigenId, cajaDestinoId, monto, descripcion, formaPagoOrigen, formaPagoDestino }),
    });

    setMostrarForm(false);
    setMonto(""); setDescripcion("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/cajas")} className="text-gray-500 hover:text-gray-700">← Cajas</button>
          <h1 className="text-xl font-bold text-gray-900">Transferencias entre Cajas</h1>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          + Nueva Transferencia
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Origen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{new Date(t.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{t.cajaOrigen.nombre}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{t.cajaDestino.nombre}</td>
                  <td className="px-4 py-3 text-right font-semibold">${t.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-gray-500">{t.descripcion || "-"}</td>
                </tr>
              ))}
              {transferencias.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin transferencias</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Panel lateral */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMostrarForm(false)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nueva Transferencia</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Caja Origen</label>
                <select value={cajaOrigenId} onChange={(e) => setCajaOrigenId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Forma de pago origen</label>
                <select value={formaPagoOrigen} onChange={(e) => setFormaPagoOrigen(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Caja Destino</label>
                <select value={cajaDestinoId} onChange={(e) => setCajaDestinoId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {cajas.filter((c) => c.id !== cajaOrigenId).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Forma de pago destino</label>
                <select value={formaPagoDestino} onChange={(e) => setFormaPagoDestino(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Monto *</label>
                <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Motivo de la transferencia..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={guardar}
                disabled={guardando || !monto || cajaOrigenId === cajaDestinoId}
                className="w-full bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Confirmar Transferencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
