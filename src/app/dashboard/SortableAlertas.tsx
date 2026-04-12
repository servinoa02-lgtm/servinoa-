"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, AlertTriangle, ExternalLink } from "lucide-react";

type Seguimiento = {
  id: string;
  texto: string;
  fecha: Date;
  orden: {
    id: string;
    numero: number;
    cliente: { nombre: string };
  };
};

type SortKey = "fecha" | "ot" | "cliente";

function formatFechaLocal(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function SortableAlertas({ seguimientos }: { seguimientos: Seguimiento[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("fecha");

  const sorted = [...seguimientos].sort((a, b) => {
    if (sortBy === "fecha") {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    }
    if (sortBy === "ot") {
      return b.orden.numero - a.orden.numero;
    }
    return a.orden.cliente.nombre.localeCompare(b.orden.cliente.nombre, "es");
  });

  const buttons: { key: SortKey; label: string }[] = [
    { key: "fecha", label: "Fecha" },
    { key: "ot", label: "N° OT" },
    { key: "cliente", label: "Cliente" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {buttons.map(b => (
          <button
            key={b.key}
            onClick={() => setSortBy(b.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
              sortBy === b.key
                ? "bg-red-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <ArrowUpDown size={10} />
            {b.label}
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle size={40} className="mx-auto mb-2 text-gray-200" />
          <p className="text-xs text-gray-400 font-medium font-sans">Sin alertas pendientes</p>
        </div>
      ) : (
        sorted.map(s => (
          <Link key={s.id} href={`/ordenes/${s.orden.id}`} className="block p-4 rounded-xl border border-gray-100 bg-white hover:border-red-600 hover:shadow-md transition-all group">
            <div className="text-[10px] font-bold text-red-600 mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>OT #{s.orden.numero} — {s.orden.cliente.nombre}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-normal">{formatFechaLocal(s.fecha)}</span>
                <ExternalLink size={12} />
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">"{s.texto}"</p>
          </Link>
        ))
      )}
    </div>
  );
}
