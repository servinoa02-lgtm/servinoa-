"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  ingreso: number;
  egreso: number;
  formaPago: string;
  saldoAcum: number;
}

interface CajaDetalle {
  id: string;
  nombre: string;
  saldo: number;
  movimientos: Movimiento[];
}

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Mercado Pago", "Otro"];

export default function CajaDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [caja, setCaja] = useState<CajaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"ingreso" | "egreso">("ingreso");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch(`/api/cajas/${id}`)
      .then((r) => r.json())
      .then((data) => { setCaja(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (id) cargar(); }, [id]);

  const guardar = async () => {
    if (!descripcion || !importe) return;
    setGuardando(true);

    await fetch(`/api/cajas/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoMovimiento, descripcion, importe, formaPago }),
    });

    setMostrarForm(false);
    setDescripcion(""); setImporte("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  if (!caja) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">Caja no encontrada</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/cajas")} className="text-gray-500 hover:text-gray-700">← Cajas</button>
          <h1 className="text-xl font-bold text-gray-900">Caja {caja.nombre}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo actual</p>
            <p className={`text-xl font-bold ${caja.saldo >= 0 ? "text-green-700" : "text-red-600"}`}>
              ${caja.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={() => { setTipoMovimiento("ingreso"); setMostrarForm(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + Agregar Ingreso
          </button>
          <button
            onClick={() => { setTipoMovimiento("egreso"); setMostrarForm(true); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            + Agregar Gasto
          </button>
          <button
            onClick={() => router.push("/cajas/transferencias")}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Transferir
          </button>
        </div>

        {/* Movimientos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 text-green-700">Ingreso</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 text-red-600">Egreso</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Forma</th>
              </tr>
            </thead>
            <tbody>
              {caja.movimientos.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{new Date(m.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3">{m.descripcion}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">
                    {m.ingreso > 0 ? `$${m.ingreso.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    {m.egreso > 0 ? `$${m.egreso.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : ""}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${m.saldoAcum >= 0 ? "text-gray-800" : "text-red-600"}`}>
                    ${m.saldoAcum.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.formaPago}</td>
                </tr>
              ))}
              {caja.movimientos.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Panel lateral movimiento */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMostrarForm(false)} />
          <div className="relative bg-white w-full max-w-sm shadow-2xl flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {tipoMovimiento === "ingreso" ? "Agregar Ingreso" : "Agregar Egreso"}
              </h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descripción *</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del movimiento..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Importe *</label>
                <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Forma de pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={guardar}
                disabled={guardando || !descripcion || !importe}
                className={`w-full text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${tipoMovimiento === "ingreso" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {guardando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
