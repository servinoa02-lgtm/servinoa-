"use client";

import { useEffect, useState } from "react";
import { FinanceChart } from "./FinanceChart";

type Periodo = "dia" | "mes" | "ano" | "total";

interface DayData {
  fecha: string;
  ingresos: number;
  egresos: number;
}

interface Props {
  initialData: DayData[];
  initialPeriodo?: Periodo;
}

const OPCIONES: { value: Periodo; label: string; subtitle: string }[] = [
  { value: "dia", label: "Día", subtitle: "Últimos 30 días" },
  { value: "mes", label: "Mes", subtitle: "Últimos 12 meses" },
  { value: "ano", label: "Año", subtitle: "Últimos 5 años" },
  { value: "total", label: "Total", subtitle: "Histórico completo" },
];

export function FinanceChartConfigurable({ initialData, initialPeriodo = "dia" }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(initialPeriodo);
  const [data, setData] = useState<DayData[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (periodo === initialPeriodo) {
      setData(initialData);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/chart?periodo=${periodo}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data) setData(j.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodo, initialPeriodo, initialData]);

  const opcionActiva = OPCIONES.find((o) => o.value === periodo) || OPCIONES[0];

  return (
    <div className="space-y-4">
      {/* Panel de Control del Gráfico */}
      <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm transition-all">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Rango Temporal</p>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              {opcionActiva.subtitle}
              {loading && <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-ping"></span>}
            </h4>
          </div>
          
          <div className="flex flex-wrap gap-1.5 p-1 bg-white rounded-lg border border-gray-200 shadow-inner">
            {OPCIONES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPeriodo(o.value)}
                disabled={loading}
                className={`px-4 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                  periodo === o.value
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Área del Gráfico */}
      <div className="relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl font-sans">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest animate-pulse">Actualizando Gráfico...</p>
          </div>
        )}
        <div className={`transition-opacity duration-300 ${loading ? "opacity-30" : "opacity-100"}`}>
          <FinanceChart data={data} />
        </div>
      </div>
    </div>
  );
}
