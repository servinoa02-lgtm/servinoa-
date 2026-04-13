import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Card({ children, className = "", title, subtitle, icon, action }: CardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || icon || action) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-3">
            {icon && <div className="text-red-600">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-bold text-gray-900 tracking-tight uppercase">{title}</h3>}
              {subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, trend, icon, color = "primary" }: {
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  icon: ReactNode;
  color?: "primary" | "emerald" | "rose" | "amber";
}) {
  const isNegative = typeof value === "number" ? value < 0 : String(value).includes("-");

  const colorMap = {
    primary: "text-red-600 bg-red-50 border-red-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  };

  const textColorMap = {
    primary: "text-gray-900",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-300 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${trend.positive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <h4 className={`text-2xl font-bold tabular-nums ${isNegative ? "text-red-600" : textColorMap[color]}`}>{value}</h4>
      </div>
    </div>
  );
}
