"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowUpDown, CheckCircle } from "lucide-react";

type Tarea = {
  id: string;
  descripcion: string;
  prioridad: string;
  vencimiento: Date | null;
  estado: string;
};

type SortKey = "prioridad" | "vencimiento" | "nombre";

const PRIORIDAD_ORDEN: Record<string, number> = {
  URGENTE: 1,
  ALTA: 2,
  MEDIA: 3,
  BAJA: 4,
};

function formatFechaLocal(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function SortableTareas({ tareas, hoy }: { tareas: Tarea[]; hoy: string }) {
  const [sortBy, setSortBy] = useState<SortKey>("prioridad");
  const hoyDate = new Date(hoy);

  const sorted = [...tareas].sort((a, b) => {
    if (sortBy === "prioridad") {
      return (PRIORIDAD_ORDEN[a.prioridad] || 99) - (PRIORIDAD_ORDEN[b.prioridad] || 99);
    }
    if (sortBy === "vencimiento") {
      if (!a.vencimiento && !b.vencimiento) return 0;
      if (!a.vencimiento) return 1;
      if (!b.vencimiento) return -1;
      return new Date(a.vencimiento).getTime() - new Date(b.vencimiento).getTime();
    }
    return a.descripcion.localeCompare(b.descripcion, "es");
  });

  const buttons: { key: SortKey; label: string }[] = [
    { key: "prioridad", label: "Prioridad" },
    { key: "vencimiento", label: "Vencimiento" },
    { key: "nombre", label: "Nombre" },
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
        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={40} className="mx-auto mb-2 text-gray-200" />
            <p className="text-xs text-gray-400 font-medium">Cronograma al dia</p>
          </div>
        ) : (
          sorted.map(t => {
            const isVencida = t.vencimiento && new Date(t.vencimiento) < hoyDate;
            return (
              <Link key={t.id} href="/tareas" className="block">
                <div className={`p-4 rounded-xl border transition-all ${isVencida ? 'border-red-200 bg-red-50' : 'border-gray-50 bg-gray-50/50 hover:bg-white hover:border-red-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={isVencida ? 'URGENTE' : t.prioridad} />
                    {t.vencimiento && <span className="text-[9px] font-bold text-gray-400">{formatFechaLocal(t.vencimiento)}</span>}
                  </div>
                  <p className="text-xs font-bold text-gray-900 uppercase leading-snug">{t.descripcion}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
