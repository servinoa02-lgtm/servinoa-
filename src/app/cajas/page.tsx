"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Caja {
  id: string;
  nombre: string;
  saldo: number;
}

const cajaColors: Record<string, string> = {
  "Pablo": "bg-blue-50 border-blue-200",
  "Julio": "bg-purple-50 border-purple-200",
  "Nico": "bg-green-50 border-green-200",
  "Servinoa": "bg-red-50 border-red-200",
  "Cheques": "bg-yellow-50 border-yellow-200",
  "Retenciones": "bg-orange-50 border-orange-200",
  "Macro": "bg-teal-50 border-teal-200",
  "Mercado Pago": "bg-cyan-50 border-cyan-200",
};

export default function CajasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/cajas")
      .then((r) => r.json())
      .then((data) => { setCajas(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  const totalGeneral = cajas.reduce((sum, c) => sum + c.saldo, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Menú</button>
          <h1 className="text-xl font-bold text-gray-900">Cajas</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total general</p>
          <p className={`text-lg font-bold ${totalGeneral >= 0 ? "text-green-700" : "text-red-600"}`}>
            ${totalGeneral.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {/* SubMenu */}
        <div className="flex gap-2 mb-6">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white"
          >
            Cajas
          </button>
          <button
            onClick={() => router.push("/cajas/transferencias")}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Transferencias
          </button>
          <button
            onClick={() => router.push("/cheques")}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cheques
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cajas.map((caja) => (
            <button
              key={caja.id}
              onClick={() => router.push(`/cajas/${caja.id}`)}
              className={`${cajaColors[caja.nombre] || "bg-gray-50 border-gray-200"} border rounded-xl p-5 text-left hover:shadow-md transition-all`}
            >
              <p className="text-sm font-semibold text-gray-700 mb-2">{caja.nombre}</p>
              <p className={`text-xl font-bold ${caja.saldo >= 0 ? "text-gray-900" : "text-red-600"}`}>
                ${caja.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
