"use client";

import { useEffect, useState } from "react";
import { FinanceChart } from "../ui/FinanceChart";
import { WorkshopChart } from "../ui/WorkshopChart";
import { Card } from "../ui/Card";
import { BarChart2, Wrench, Calendar } from "lucide-react";

type Periodo = "dia" | "mes" | "ano" | "total" | "custom" | "rango";

interface Props {
  initialFinanceData: any[];
  initialWorkshopData: {
    chartData: any[];
    topClientes: any[];
  };
  initialPeriodo?: Periodo;
}

const OPCIONES: { value: Periodo; label: string; subtitle: string }[] = [
  { value: "dia",    label: "Día",           subtitle: "Últimos 30 días" },
  { value: "mes",    label: "Mes",           subtitle: "Mes actual (desde el 1ro)" },
  { value: "ano",    label: "Año",           subtitle: "Ejercicio actual" },
  { value: "total",  label: "Total",         subtitle: "Histórico completo" },
  { value: "custom", label: "Personalizado", subtitle: "Brecha de días a elección" },
  { value: "rango",  label: "Rango",         subtitle: "Seleccioná desde — hasta" },
];

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
function hace30(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function UnifiedDashboardPanel({
  initialFinanceData,
  initialWorkshopData,
  initialPeriodo = "total",
}: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(initialPeriodo);

  // Custom (días)
  const [diasCustom, setDiasCustom] = useState(90);
  const [diasInput, setDiasInput]   = useState("90");

  // Rango (fechas)
  const [desde, setDesde]           = useState(hace30);
  const [hasta, setHasta]           = useState(hoy);
  const [rangoAplicado, setRangoAplicado] = useState<{ desde: string; hasta: string } | null>(null);

  const [financeData,  setFinanceData]  = useState(initialFinanceData);
  const [workshopData, setWorkshopData] = useState(initialWorkshopData);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    if (periodo === initialPeriodo && periodo !== "custom" && periodo !== "rango") {
      setFinanceData(initialFinanceData);
      setWorkshopData(initialWorkshopData);
      return;
    }
    if (periodo === "rango" && !rangoAplicado) return; // esperar que presionen Aplicar

    let cancelled = false;
    setLoading(true);

    let url = `/api/dashboard/chart?periodo=${periodo}`;
    if (periodo === "custom") url += `&dias=${diasCustom}`;
    if (periodo === "rango" && rangoAplicado) url += `&desde=${rangoAplicado.desde}&hasta=${rangoAplicado.hasta}`;

    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data)     setFinanceData(j.data);
        if (!cancelled && j.workshop) setWorkshopData(j.workshop);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [periodo, diasCustom, rangoAplicado, initialPeriodo, initialFinanceData, initialWorkshopData]);

  const opcionActiva = OPCIONES.find((o) => o.value === periodo) || OPCIONES[0];
  const subtituloActivo =
    periodo === "custom" ? `Últimos ${diasCustom} días` :
    periodo === "rango" && rangoAplicado ? `${rangoAplicado.desde} → ${rangoAplicado.hasta}` :
    opcionActiva.subtitle;

  return (
    <div className="space-y-8">
      {/* Selector de Periodo */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Filtro Temporal Unificado</p>
            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-3">
              {subtituloActivo}
              {loading && <span className="inline-block w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />}
            </h4>
          </div>

          <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100">
            {OPCIONES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setPeriodo(o.value);
                  if (o.value === "rango") setRangoAplicado(null);
                }}
                disabled={loading}
                className={`flex items-center gap-1.5 px-5 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ${
                  periodo === o.value
                    ? "bg-gray-900 text-white shadow-md scale-105"
                    : "text-gray-500 hover:bg-white hover:text-gray-900"
                } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {o.value === "rango" && <Calendar size={12} />}
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-panel: Personalizado (días) */}
        {periodo === "custom" && (
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Días a mostrar:</p>
            <input
              type="number" min={1} max={3650}
              value={diasInput}
              onChange={(e) => setDiasInput(e.target.value)}
              className="w-24 px-3 py-1.5 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-red-600 transition-all"
            />
            <button
              type="button" disabled={loading}
              onClick={() => {
                const v = Math.max(1, Math.min(3650, parseInt(diasInput) || 90));
                setDiasInput(String(v));
                setDiasCustom(v);
              }}
              className="px-5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-gray-900 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        )}

        {/* Sub-panel: Rango de fechas */}
        {periodo === "rango" && (
          <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Desde</label>
              <input
                type="date"
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
                className="px-3 py-2 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-red-600 transition-all cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hasta</label>
              <input
                type="date"
                value={hasta}
                min={desde}
                max={hoy()}
                onChange={(e) => setHasta(e.target.value)}
                className="px-3 py-2 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-red-600 transition-all cursor-pointer"
              />
            </div>
            <button
              type="button" disabled={loading || !desde || !hasta}
              onClick={() => setRangoAplicado({ desde, hasta })}
              className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-wider bg-gray-900 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
            >
              <Calendar size={12} /> Aplicar rango
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Flujo de Operaciones (Finanzas)" icon={<BarChart2 size={20} className="text-red-600" />}>
          <div className={`transition-all duration-500 ${loading ? "opacity-30 scale-[0.98]" : "opacity-100 scale-100"}`}>
            <FinanceChart data={financeData} />
          </div>
        </Card>

        <Card title="Volumen de Ingresos al Taller" icon={<Wrench size={20} className="text-gray-900" />}>
          <div className={`transition-all duration-500 ${loading ? "opacity-30 scale-[0.98]" : "opacity-100 scale-100"}`}>
            <WorkshopChart data={workshopData.chartData} title="Máquinas Ingresadas" color="#111827" />
          </div>
        </Card>
      </div>
    </div>
  );
}
