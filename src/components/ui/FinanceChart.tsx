"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

interface DayData {
  fecha: string; // "DD/MM"
  ingresos: number;
  egresos: number;
}

interface FinanceChartProps {
  data: DayData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-border-custom p-4 rounded-xl shadow-xl">
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-emerald-400">
            Ingresos: ${payload[0].value.toLocaleString("es-AR")}
          </p>
          <p className="text-sm font-black text-rose-400">
            Egresos: ${payload[1].value.toLocaleString("es-AR")}
          </p>
          <div className="pt-1 mt-1 border-t border-white/5 flex justify-between gap-4">
            <span className="text-[10px] text-slate-400">Balance:</span>
            <span className={`text-[10px] font-bold ${payload[0].value - payload[1].value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${(payload[0].value - payload[1].value).toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function FinanceChart({ data }: FinanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm italic font-medium">
        No se registran movimientos en el periodo seleccionado.
      </div>
    );
  }

  return (
    <div className="w-full h-80 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#1e293b" 
            opacity={0.5} 
          />
          <XAxis 
            dataKey="fecha" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
            minTickGap={30}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
          <Area
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorIngresos)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="egresos"
            name="Egresos"
            stroke="#f43f5e"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorEgresos)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
