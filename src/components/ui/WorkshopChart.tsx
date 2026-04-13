"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface DataPoint {
  label: string;
  valor: number;
}

interface WorkshopChartProps {
  data: DataPoint[];
  title?: string;
  color?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl ring-1 ring-slate-100">
        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-gray-900 font-sans">
            Equipos Ingresados: <span className="text-red-600">{payload[0].value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function WorkshopChart({ data, title = "Ingreso de Máquinas", color = "#ef4444" }: WorkshopChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm italic font-medium">
        No se registran datos para el periodo seleccionado.
      </div>
    );
  }

  return (
    <div className="w-full h-80 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#e2e8f0" 
          />
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            minTickGap={30}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="valor"
            name={title}
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValor)"
            animationDuration={1500}
            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
