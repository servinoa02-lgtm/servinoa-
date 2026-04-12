import { 
  PackageOpen, 
  UserCheck, 
  Search, 
  ClipboardCheck, 
  Calculator, 
  FileText, 
  ThumbsUp, 
  Wrench, 
  RotateCcw, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Ban,
  PenTool,
  Clock,
  Wallet,
  Check,
  ShieldAlert,
  AlertCircle,
  Briefcase,
  Landmark,
  CornerUpRight,
  TimerReset,
  CalendarClock,
  CheckCircle,
  ArrowDown,
  ArrowUp,
  Zap,
  ShieldEllipsis,
  Activity,
  ShieldCheck,
  Headset,
  Users,
  HardHat,
  Banknote,
  Receipt,
  ShoppingCart,
  Truck,
  Lightbulb,
  CreditCard,
  Building2,
  LucideIcon
} from "lucide-react";

type EnumsMapping = {
  [key: string]: { label: string; color: string; bg: string; dot: string; icon: LucideIcon };
};

const statusConfig: EnumsMapping = {
  // --- Estados OT (OrdenTrabajo) ---
  RECIBIDO: { label: "Recibido", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500", icon: PackageOpen },
  PARA_REVISAR: { label: "Para Revisar", color: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-600", icon: UserCheck },
  EN_REVISION: { label: "En Revisión", color: "text-sky-700", bg: "bg-sky-100", dot: "bg-sky-500", icon: Search },
  REVISADO: { label: "Revisado", color: "text-indigo-700", bg: "bg-indigo-100", dot: "bg-indigo-600", icon: ClipboardCheck },
  PARA_PRESUPUESTAR: { label: "Para Presupuestar", color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-600", icon: Calculator },
  PRESUPUESTADO: { label: "Presupuestado", color: "text-cyan-700", bg: "bg-cyan-100", dot: "bg-cyan-600", icon: FileText },
  APROBADO: { label: "Aprobado", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-600", icon: ThumbsUp },
  EN_REPARACION: { label: "En Reparación", color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-600", icon: Wrench },
  REPARADO: { label: "Reparado", color: "text-lime-700", bg: "bg-lime-100", dot: "bg-lime-600", icon: CheckCircle },
  PARA_ENTREGAR: { label: "Para Entregar", color: "text-teal-700", bg: "bg-teal-100", dot: "bg-teal-600", icon: Package },
  ENTREGADO_REALIZADO: { label: "Entregado (OK)", color: "text-emerald-800", bg: "bg-emerald-100", dot: "bg-emerald-700", icon: CheckCircle2 },
  ENTREGADO_SIN_REALIZAR: { label: "Entregado (S/R)", color: "text-rose-800", bg: "bg-rose-100", dot: "bg-rose-700", icon: XCircle },
  RECHAZADO: { label: "Rechazado", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-600", icon: Ban },

  // --- Presupuestos & Cobros ---
  BORRADOR: { label: "Borrador", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400", icon: PenTool },
  PENDIENTE: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-600", icon: Clock },
  PARCIAL: { label: "Parcial", color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-600", icon: Wallet },
  COBRADO: { label: "Cobrado", color: "text-emerald-800", bg: "bg-emerald-100", dot: "bg-emerald-700", icon: Check },
  APROBACION_PENDIENTE: { label: "Aprob. Pendiente", color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-600", icon: ShieldAlert },
  COBRO_PENDIENTE: { label: "Cobro Pendiente", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-600", icon: AlertCircle },

  // --- Cheques ---
  EN_CARTERA: { label: "En Cartera", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-600", icon: Briefcase },
  DEPOSITADO: { label: "Depositado", color: "text-indigo-700", bg: "bg-indigo-100", dot: "bg-indigo-600", icon: Landmark },
  ENDOSADO: { label: "Endosado", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400", icon: CornerUpRight },
  VENCIDO: { label: "Vencido", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-600", icon: TimerReset },
  PROXIMO: { label: "Próximo", color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-600", icon: CalendarClock },
  
  // --- Tareas ---
  EN_PROGRESO: { label: "En Progreso", color: "text-sky-600", bg: "bg-sky-100", dot: "bg-sky-500", icon: Activity },
  BAJA: { label: "Baja", color: "text-blue-600", bg: "bg-blue-100", dot: "bg-blue-400", icon: ArrowDown },
  MEDIA: { label: "Media", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400", icon: ShieldEllipsis },
  ALTA: { label: "Alta", color: "text-orange-600", bg: "bg-orange-100", dot: "bg-orange-500", icon: ArrowUp },
  URGENTE: { label: "Urgente", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-500", icon: Zap },
  COMPLETADA: { label: "Completada", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500", icon: CheckCircle2 },
  
  // --- Roles ---
  ADMIN: { label: "Administrador", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-600", icon: ShieldCheck },
  TECNICO: { label: "Técnico", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-600", icon: HardHat },
  JEFE: { label: "Jefe", color: "text-indigo-700", bg: "bg-indigo-100", dot: "bg-indigo-600", icon: Users },
  ADMINISTRACION: { label: "Administración", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-600", icon: Headset },
  CAJA: { label: "Caja", color: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-600", icon: Building2 },
  VENTAS: { label: "Ventas", color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-600", icon: ShoppingCart },

  // --- Finanzas (Categorías) ---
  GASTO_VARIOS: { label: "Varios", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400", icon: Receipt },
  SUELDO: { label: "Sueldos", color: "text-emerald-600", bg: "bg-emerald-100", dot: "bg-emerald-500", icon: Banknote },
  INSUMOS: { label: "Insumos", color: "text-blue-600", bg: "bg-blue-100", dot: "bg-blue-500", icon: ShoppingCart },
  MANTENIMIENTO: { label: "Mantenimiento", color: "text-orange-600", bg: "bg-orange-100", dot: "bg-orange-500", icon: Wrench },
  IMPUESTOS: { label: "Impuestos", color: "text-red-600", bg: "bg-red-100", dot: "bg-red-500", icon: Landmark },
  LOGISTICA: { label: "Logística", color: "text-indigo-600", bg: "bg-indigo-100", dot: "bg-indigo-500", icon: Truck },
  EQUIPAMIENTO: { label: "Equipamiento", color: "text-violet-600", bg: "bg-violet-100", dot: "bg-violet-500", icon: Lightbulb },

  // --- Otros ---
  PRESUPUESTO: { label: "Presupuesto", color: "text-cyan-700", bg: "bg-cyan-100", dot: "bg-cyan-600", icon: FileText },
  COBRANZA_VARIA: { label: "Cobr. Varia", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-600", icon: Banknote },
  OK: { label: "OK", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-600", icon: ThumbsUp },
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
    icon: AlertCircle,
  };

  const Icon = config.icon || AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${config.bg} ${config.color} border-current/20 shadow-sm ${className}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}
