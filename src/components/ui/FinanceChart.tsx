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
import { formatMoney } from "@/lib/constants";

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
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl ring-1 ring-slate-100">
        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-emerald-600">
            Ingresos: ${formatMoney(payload[0].value, 0)}
          </p>
          <p className="text-sm font-black text-rose-600">
            Egresos: ${formatMoney(payload[1].value, 0)}
          </p>
          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Balance:</span>
            <span className={`text-[10px] font-black ${payload[0].value - payload[1].value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${formatMoney(payload[0].value - payload[1].value, 0)}
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
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm italic font-medium">
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
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#e2e8f0" 
          />
          <XAxis 
            dataKey="fecha" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            minTickGap={30}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '25px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}
          />
          <Area
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke="#059669"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorIngresos)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="egresos"
            name="Egresos"
            stroke="#e11d48"
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
