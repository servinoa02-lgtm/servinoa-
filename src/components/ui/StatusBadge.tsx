import { ReactNode } from "react";

type EnumsMapping = {
  [key: string]: { label: string; color: string; bg: string; dot: string };
};

// Mapeo unificado para los distintos estados de la aplicación con estética refinada
const statusConfig: EnumsMapping = {
  // Presupuestos & Cobros
  BORRADOR: { label: "Borrador", color: "text-gray-500", bg: "bg-gray-100", dot: "bg-gray-400" },
  PRESUPUESTADO: { label: "Presupuestado", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-600" },
  APROBADO: { label: "Aprobado", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-600" },
  RECHAZADO: { label: "Rechazado", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-600" },
  PENDIENTE: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-600" },
  PARCIAL: { label: "Parcial", color: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-600" },
  COBRADO: { label: "Cobrado", color: "text-emerald-800", bg: "bg-emerald-100", dot: "bg-emerald-700" },

  // Cheques
  EN_CARTERA: { label: "En Cartera", color: "text-gray-700", bg: "bg-gray-100", dot: "bg-gray-500" },
  DEPOSITADO: { label: "Depositado", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-600" },
  ENDOSADO: { label: "Endosado", color: "text-gray-500", bg: "bg-gray-100", dot: "bg-gray-400" },
  VENCIDO: { label: "Vencido", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-600" },
  PROXIMO: { label: "Próximo", color: "text-orange-700", bg: "bg-orange-50", dot: "bg-orange-600" },
  
  // Custom Status
  OK: { label: "OK", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-600" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status.replace(/_/g, " "),
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} border-current/10 shadow-sm ${className}`}
    >
      <span className={`w-1 h-1 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
