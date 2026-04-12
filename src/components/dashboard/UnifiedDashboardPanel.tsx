"use client";

import { useEffect, useState } from "react";
import { FinanceChart } from "../ui/FinanceChart";
import { WorkshopChart } from "../ui/WorkshopChart";
import { Card } from "../ui/Card";
import { 
  BarChart2, 
  Wrench, 
  Users, 
  ChevronRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import Link from "next/link";

type Periodo = "dia" | "mes" | "ano" | "total";

interface Props {
  initialFinanceData: any[];
  initialWorkshopData: {
    chartData: any[];
    topClientes: any[];
  };
  initialPeriodo?: Periodo;
}

const OPCIONES: { value: Periodo; label: string; subtitle: string }[] = [
  { value: "dia", label: "Día", subtitle: "Últimos 30 días" },
  { value: "mes", label: "Mes", subtitle: "Mes actual (desde el 1ro)" },
  { value: "ano", label: "Año", subtitle: "Ejercicio actual (desde 5 Ene)" },
  { value: "total", label: "Total", subtitle: "Histórico completo" },
];

export function UnifiedDashboardPanel({ 
  initialFinanceData, 
  initialWorkshopData, 
  initialPeriodo = "total" 
}: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(initialPeriodo);
  const [financeData, setFinanceData] = useState(initialFinanceData);
  const [workshopData, setWorkshopData] = useState(initialWorkshopData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (periodo === initialPeriodo) {
      setFinanceData(initialFinanceData);
      setWorkshopData(initialWorkshopData);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/chart?periodo=${periodo}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data) setFinanceData(j.data);
        if (!cancelled && j.workshop) setWorkshopData(j.workshop);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [periodo, initialPeriodo, initialFinanceData, initialWorkshopData]);

  const opcionActiva = OPCIONES.find((o) => o.value === periodo) || OPCIONES[0];

  return (
    <div className="space-y-8">
      {/* Selector de Periodo Centralizado */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-all">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Filtro Temporal Unificado</p>
            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-3">
              {opcionActiva.subtitle}
              {loading && <span className="inline-block w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>}
            </h4>
          </div>
          
          <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100">
            {OPCIONES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPeriodo(o.value)}
                disabled={loading}
                className={`px-6 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ${
                  periodo === o.value
                    ? "bg-gray-900 text-white shadow-md transform scale-105"
                    : "text-gray-500 hover:bg-white hover:text-gray-900"
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Izquierdo: Gráficos */}
        <div className="lg:col-span-8 space-y-8">
          <Card
            title="Flujo de Operaciones (Finanzas)"
            icon={<BarChart2 size={20} className="text-red-600" />}
            action={<Link href="/cajas" className="text-xs font-black text-red-600 hover:underline flex items-center gap-1">ANÁLISIS <ChevronRight size={14} /></Link>}
            className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className={`transition-all duration-500 ${loading ? "opacity-30 scale-[0.98]" : "opacity-100 scale-100"}`}>
              <FinanceChart data={financeData} />
            </div>
          </Card>

          <Card
            title="Volumen de Ingresos al Taller"
            icon={<Wrench size={20} className="text-gray-900" />}
            className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className={`transition-all duration-500 ${loading ? "opacity-30 scale-[0.98]" : "opacity-100 scale-100"}`}>
              <WorkshopChart data={workshopData.chartData} title="Máquinas Ingresadas" color="#111827" />
            </div>
          </Card>
        </div>

        {/* Lado Derecho: Listas y Métricas Complementarias */}
        <div className="lg:col-span-4 space-y-8">
          {/* Top Clientes Filtrado */}
          <Card 
            title="Clientes Destacados" 
            icon={<Users size={20} className="text-gray-900" />}
            subtitle={`Top del ${opcionActiva.label.toLowerCase()}`}
          >
            <div className={`space-y-4 transition-all duration-500 ${loading ? "opacity-30 translate-x-4" : "opacity-100 translate-x-0"}`}>
              {workshopData.topClientes.length > 0 ? (
                workshopData.topClientes.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-gray-200 transition-colors group">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black bg-gray-900 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-sm group-hover:bg-red-600 transition-colors">{idx + 1}</span>
                      <span className="text-xs font-black text-gray-700 truncate max-w-[150px]">{c.nombre}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-gray-900">
                        {c.cantidad} <span className="text-[9px] text-gray-400 uppercase tracking-widest">Equipos</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sin datos en este periodo</p>
                </div>
              )}
            </div>
          </Card>

          {/* Resumen de Rendimiento (Placeholder para futuras métricas de rentabilidad) */}
          <Card title="Tendencias Rápidas" icon={<TrendingUp size={20} className="text-emerald-500" />}>
             <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                   <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Crecimiento Operativo</p>
                   <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                     Análisis automático de flujo de trabajo basado en ingresos históricos.
                   </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Métricas en tiempo real</p>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
