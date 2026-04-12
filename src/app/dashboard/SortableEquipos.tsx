"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowUpDown } from "lucide-react";

type OT = {
  id: string;
  numero: number;
  estado: string;
  fechaRecepcion: Date;
  fechaEstimadaEntrega: Date | null;
  cliente: { nombre: string };
};

type SortKey = "estado" | "fecha" | "numero";

const ESTADO_PRIORIDAD: Record<string, number> = {
  PARA_REVISAR: 1,
  RECIBIDO: 2,
  EN_REVISION: 3,
  REVISADO: 4,
  PARA_PRESUPUESTAR: 5,
  PRESUPUESTADO: 6,
  APROBADO: 7,
  EN_REPARACION: 8,
  REPARADO: 9,
  PARA_ENTREGAR: 10,
};

function formatFechaLocal(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function SortableEquipos({ ots, hoy }: { ots: OT[]; hoy: string }) {
  const [sortBy, setSortBy] = useState<SortKey>("estado");
  const hoyDate = new Date(hoy);

  const sorted = [...ots].sort((a, b) => {
    if (sortBy === "estado") {
      return (ESTADO_PRIORIDAD[a.estado] || 99) - (ESTADO_PRIORIDAD[b.estado] || 99);
    }
    if (sortBy === "fecha") {
      return new Date(a.fechaRecepcion).getTime() - new Date(b.fechaRecepcion).getTime();
    }
    return b.numero - a.numero;
  });

  const buttons: { key: SortKey; label: string }[] = [
    { key: "estado", label: "Estado" },
    { key: "fecha", label: "Antigüedad" },
    { key: "numero", label: "N° OT" },
  ];

  return (
    <>
      <div className="flex gap-1.5 mb-4">
        {buttons.map(b => (
          <button
            key={b.key}
            onClick={() => setSortBy(b.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
              sortBy === b.key
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <ArrowUpDown size={10} />
            {b.label}
          </button>
        ))}
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {sorted.map(ot => (
          <Link key={ot.id} href={`/ordenes/${ot.id}`} className="block p-4 rounded-xl bg-white border border-gray-100 hover:border-red-600 transition-all shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-red-600 uppercase">OT #{ot.numero}</span>
              <StatusBadge status={ot.estado} />
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate border-b border-gray-50 pb-2 mb-2">{ot.cliente.nombre}</div>
            {ot.fechaEstimadaEntrega && (
              <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase">
                Entrega:
                <span className={`px-1.5 py-0.5 rounded ${new Date(ot.fechaEstimadaEntrega) < hoyDate ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                  {formatFechaLocal(ot.fechaEstimadaEntrega)}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
