import { ReactNode } from "react";

type EnumsMapping = {
  [key: string]: { label: string; color: string; bg: string; dot: string };
};

// Mapeo unificado para los distintos estados de la aplicación con estética refinada
const statusConfig: EnumsMapping = {
  // Presupuestos & Cobros
  BORRADOR: { label: "Borrador", color: "text-slate-400", bg: "bg-slate-400/10", dot: "bg-slate-400" },
  PRESUPUESTADO: { label: "Presupuestado", color: "text-indigo-400", bg: "bg-indigo-400/10", dot: "bg-indigo-400" },
  APROBADO: { label: "Aprobado", color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
  RECHAZADO: { label: "Rechazado", color: "text-rose-400", bg: "bg-rose-400/10", dot: "bg-rose-400" },
  PENDIENTE: { label: "Pendiente", color: "text-amber-400", bg: "bg-amber-400/10", dot: "bg-amber-400" },
  PARCIAL: { label: "Cobro Parcial", color: "text-violet-400", bg: "bg-violet-400/10", dot: "bg-violet-400" },
  COBRADO: { label: "Cobrado", color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },

  // Cheques
  EN_CARTERA: { label: "En Cartera", color: "text-blue-400", bg: "bg-blue-400/10", dot: "bg-blue-400" },
  DEPOSITADO: { label: "Depositado", color: "text-amber-400", bg: "bg-amber-400/10", dot: "bg-amber-400" },
  ENDOSADO: { label: "Endosado", color: "text-slate-400", bg: "bg-slate-400/10", dot: "bg-slate-400" },
  VENCIDO: { label: "Vencido", color: "text-rose-400", bg: "bg-rose-400/10", dot: "bg-rose-400" },
  PROXIMO: { label: "Próximo a Vencer", color: "text-orange-400", bg: "bg-orange-400/10", dot: "bg-orange-400" },
  
  // Custom Status
  OK: { label: "OK", color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status.replace(/_/g, " "),
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-transparent select-none ${config.bg} ${config.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
