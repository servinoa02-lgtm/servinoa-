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
    <div className={`bg-surface border border-border-custom rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {(title || icon || action) && (
        <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="text-secondary">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
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
  const colorMap = {
    primary: "text-brand-primary bg-brand-primary/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
    rose: "text-rose-400 bg-rose-400/10",
    amber: "text-amber-400 bg-amber-400/10",
  };

  const textColorMap = {
    primary: "text-brand-primary",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
  };

  return (
    <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${trend.positive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className={`text-2xl font-black tracking-tight ${textColorMap[color]}`}>{value}</h4>
      </div>
    </div>
  );
}
