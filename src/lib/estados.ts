export const FLUJO_ESTADOS: Record<string, string[]> = {
  RECIBIDO: ["PARA_REVISAR"],
  PARA_REVISAR: ["EN_REVISION"],
  EN_REVISION: ["REVISADO"],
  REVISADO: ["PARA_PRESUPUESTAR"],
  PARA_PRESUPUESTAR: ["PRESUPUESTADO"],
  PRESUPUESTADO: ["APROBADO", "RECHAZADO"],
  APROBADO: ["EN_REPARACION"],
  EN_REPARACION: ["REPARADO"],
  REPARADO: ["PARA_ENTREGAR"],
  PARA_ENTREGAR: ["ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR"],
  ENTREGADO_REALIZADO: [],
  ENTREGADO_SIN_REALIZAR: [],
  RECHAZADO: ["PARA_ENTREGAR"],
};

export const estadoColors: Record<string, string> = {
  RECIBIDO: "bg-gray-100 text-gray-700 border-gray-300",
  PARA_REVISAR: "bg-yellow-100 text-yellow-700 border-yellow-300",
  EN_REVISION: "bg-blue-100 text-blue-700 border-blue-300",
  REVISADO: "bg-orange-100 text-orange-700 border-orange-300",
  PARA_PRESUPUESTAR: "bg-red-100 text-red-700 border-red-300",
  PRESUPUESTADO: "bg-purple-100 text-purple-700 border-purple-300",
  APROBADO: "bg-green-100 text-green-700 border-green-300",
  EN_REPARACION: "bg-blue-200 text-blue-800 border-blue-400",
  REPARADO: "bg-teal-100 text-teal-700 border-teal-300",
  PARA_ENTREGAR: "bg-cyan-100 text-cyan-700 border-cyan-300",
  ENTREGADO_REALIZADO: "bg-green-200 text-green-800 border-green-400",
  ENTREGADO_SIN_REALIZAR: "bg-orange-200 text-orange-800 border-orange-400",
  RECHAZADO: "bg-red-200 text-red-800 border-red-400",
};

export const TODOS_ESTADOS = [
  "RECIBIDO", "PARA_REVISAR", "EN_REVISION", "REVISADO",
  "PARA_PRESUPUESTAR", "PRESUPUESTADO", "APROBADO", "EN_REPARACION",
  "REPARADO", "PARA_ENTREGAR", "ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR", "RECHAZADO",
];

export function formatEstado(estado: string) {
  return estado?.replace(/_/g, " ") || "";
}
