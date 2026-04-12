import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Wrench,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Clock,
  ExternalLink,
  ChevronRight,
  Target,
  Bell,
  Activity
} from "lucide-react";
import Link from "next/link";
import { GlobalNoteForm } from "./GlobalNoteForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FinanceChartConfigurable } from "@/components/ui/FinanceChartConfigurable";
import { Card, StatCard } from "@/components/ui/Card";
import { SortableEquipos } from "./SortableEquipos";
import { SortableTareas } from "./SortableTareas";
import { SortableAlertas } from "./SortableAlertas";
import { formatFecha, formatHora, inicioMesAR, finMesAR, haceNDiasAR, labelDiaMes, anoActualAR } from "@/lib/dateUtils";
import { adjustDateForBusinessCycle } from "@/lib/businessCycle";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const role = (session.user as any).rol;
  const isAdminOrJefe = ["ADMIN", "JEFE"].includes(role);
  const canSeeFinances = ["ADMIN", "JEFE", "ADMINISTRACION"].includes(role);
  const hoy = new Date();

  // 1. Tareas Asignadas
  const misTareas = await prisma.tarea.findMany({
    where: { usuarioId: userId, estado: { not: "COMPLETADA" } },
    orderBy: [{ vencimiento: "asc" }, { prioridad: "desc" }]
  });

  // 2. Taller: OTs Activas
  const otsEnProceso = await prisma.ordenTrabajo.findMany({
    where: { estado: { notIn: ["ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR", "RECHAZADO"] } },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaRecepcion: "desc" }
  });

  // 3. Seguimientos y Alertas
  const seguimientos = await prisma.nota.findMany({
    where: {
      esSeguimiento: true,
      orden: { estado: { notIn: ["ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR", "RECHAZADO"] } }
    },
    include: {
      orden: {
        select: {
          numero: true,
          id: true,
          cliente: { select: { nombre: true } }
        }
      }
    },
    orderBy: { fecha: "desc" }
  });

  // 5. Resumen Financiero Mes Actual (Sincronizado con Ciclo Comercial)
  const inicioMesStd = inicioMesAR();
  const finMesStd = finMesAR();
  
  const movsParaResumen = await prisma.movimientoCaja.findMany({
    where: {
      fecha: {
        gte: haceNDiasAR(inicioMesStd, 10),
        lte: haceNDiasAR(finMesStd, -10)
      }
    },
    select: { fecha: true, ingreso: true, egreso: true }
  });

  let mesIngresos = 0;
  let mesEgresos = 0;
  movsParaResumen.forEach(m => {
    const adjusted = adjustDateForBusinessCycle(new Date(m.fecha));
    if (adjusted >= inicioMesStd && adjusted <= finMesStd) {
      mesIngresos += m.ingreso || 0;
      mesEgresos += m.egreso || 0;
    }
  });

  const mesBalance = mesIngresos - mesEgresos;

  // 6. Capital Total del Sistema (Histórico)
  const capitalAgg = await prisma.movimientoCaja.aggregate({
    _sum: { ingreso: true, egreso: true }
  });
  const capitalTotal = (capitalAgg._sum.ingreso || 0) - (capitalAgg._sum.egreso || 0);

  // 6c. Saldo en Calle (Presupuestos APROBADOS con deuda)
  const pptos = await prisma.presupuesto.findMany({
    where: { estado: "APROBADO" },
    include: { items: true, cobranzas: { select: { importe: true } } }
  });

  let saldoEnCalle = 0;
  pptos.forEach(p => {
    const subtotal = p.items.reduce((acc, item) => acc + item.total, 0);
    const total = p.incluyeIva ? subtotal * 1.21 : subtotal;
    const cobrado = p.cobranzas.reduce((acc, c) => acc + c.importe, 0);
    saldoEnCalle += Math.max(0, total - cobrado);
  });

  // 7. Gráfico: Histórico Total
  const movsTotales = await prisma.movimientoCaja.findMany({
    select: { fecha: true, ingreso: true, egreso: true },
    orderBy: { fecha: 'asc' },
  });

  const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number }>();

  if (movsTotales.length > 0) {
    const firstDate = new Date(movsTotales[0].fecha);
    const lastDate = new Date();
    
    let currY = firstDate.getFullYear();
    let currM = firstDate.getMonth();
    const lastY = lastDate.getFullYear();
    const lastM = lastDate.getMonth();

    while (currY < lastY || (currY === lastY && currM <= lastM)) {
      const k = `${currY}-${currM}`;
      buckets.set(k, {
        fecha: `${mesesLabels[currM]} ${String(currY).slice(2)}`,
        ingresos: 0,
        egresos: 0
      });
      currM++;
      if (currM > 11) {
        currM = 0;
        currY++;
      }
    }

    for (const m of movsTotales) {
      const adjusted = adjustDateForBusinessCycle(new Date(m.fecha));
      const k = `${adjusted.getFullYear()}-${adjusted.getMonth()}`;
      const b = buckets.get(k);
      if (b) {
        b.ingresos += m.ingreso || 0;
        b.egresos += m.egreso || 0;
      }
    }
  }
  
  const chartData = Array.from(buckets.values());

  const notaGlobal = await prisma.configuracion.findUnique({
    where: { clave: "NOTA_GLOBAL" }
  });

  return (
    <div className="p-4 md:p-6 lg:p-10 space-y-8 md:space-y-10 bg-gray-50 font-sans">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-8">
        <div className="pl-10 lg:pl-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Panel de Control</p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            Escritorio <span className="text-red-600">Administrativo</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-gray-200 px-5 py-3 rounded-xl shadow-sm flex items-center gap-4">
            <Clock size={20} className="text-red-600" />
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Fecha y Hora Actual</p>
              <span className="text-sm font-bold text-gray-900">
                {formatFecha(hoy)} — {formatHora(hoy, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Resumen Financiero */}
      {canSeeFinances && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <StatCard
            label="Total del Sistema"
            value={`$${totalPatrimonio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
            icon={<Activity size={20} />}
            color="primary"
            trend={{ value: "Efectivo + Deuda", positive: totalPatrimonio >= 0 }}
          />
          <StatCard
            label="Capital en Cajas"
            value={`$${capitalTotal.toLocaleString("es-AR")}`}
            icon={<DollarSign size={20} />}
            color="emerald"
            trend={{ value: "Dinero Líquido", positive: capitalTotal >= 0 }}
          />
          <StatCard
            label="Deuda en Calle"
            value={`$${saldoEnCalle.toLocaleString("es-AR")}`}
            icon={<Target size={20} />}
            color="rose"
            trend={{ value: "Saldo Pendiente", positive: false }}
          />
          <StatCard
            label="Ingresos Mes"
            value={`$${mesIngresos.toLocaleString("es-AR")}`}
            icon={<TrendingUp size={20} />}
            color="emerald"
          />
          <StatCard
            label="Egresos Mes"
            value={`$${mesEgresos.toLocaleString("es-AR")}`}
            icon={<TrendingDown size={20} />}
            color="rose"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Gráfico */}
        {canSeeFinances && (
          <div className="lg:col-span-8">
            <Card
              title="Flujo de Operaciones"
              icon={<BarChart2 size={20} className="text-red-600" />}
              action={<Link href="/cajas" className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">Ver todos <ChevronRight size={14} /></Link>}
              className="h-full rounded-2xl shadow-sm border border-gray-200"
            >
              <div className="py-4">
                <FinanceChartConfigurable initialData={chartData} initialPeriodo="total" />
              </div>
            </Card>
          </div>
        )}

        {/* Alertas y Saldos de Caja */}
        <div className={canSeeFinances ? "lg:col-span-4 space-y-8" : "lg:col-span-12 h-full"}>
          {canSeeFinances && (
            <Card title="Disponibilidad por Caja" icon={<DollarSign size={20} className="text-red-600" />}>
               <div className="space-y-3">
                  {cajasConSaldo.map(c => (
                    <div key={c.nombre} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{c.nombre}</span>
                      <span className={`text-sm font-bold tabular-nums ${c.saldo >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        ${c.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
               </div>
            </Card>
          )}

          <Card
            title="Alertas de Seguimiento"
            icon={<Bell size={20} className="text-red-600" />}
            className="border border-gray-200 rounded-2xl shadow-sm"
          >
            <SortableAlertas seguimientos={seguimientos.map(s => ({ ...s, fecha: s.fecha }))} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* Tareas */}
        <Card
          title="Tareas Pendientes"
          icon={<Target size={20} className="text-gray-900" />}
          action={<span className="text-[10px] font-bold bg-gray-900 text-white px-3 py-1 rounded-md">{misTareas.length}</span>}
          className="rounded-2xl shadow-sm border border-gray-200"
        >
          <SortableTareas tareas={misTareas.map(t => ({ ...t }))} hoy={hoy.toISOString()} />
        </Card>

        {/* Taller */}
        <Card
          title="Equipos en Taller"
          icon={<Wrench size={20} className="text-gray-900" />}
          action={<span className="text-[10px] font-bold border border-gray-200 px-3 py-1 rounded-md">{otsEnProceso.length}</span>}
          className="rounded-2xl shadow-sm border border-gray-200"
        >
          <SortableEquipos ots={otsEnProceso.map(ot => ({ ...ot }))} hoy={hoy.toISOString()} />
        </Card>

        {/* Comunicaciones */}
        <Card
          title="Avisos del Equipo"
          icon={<MessageSquare size={20} className="text-gray-900" />}
          className="rounded-2xl shadow-sm border border-gray-200"
        >
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <GlobalNoteForm initialNote={notaGlobal?.valor || ""} />
          </div>
          <p className="text-[9px] text-gray-400 font-medium text-center mt-6 uppercase tracking-widest">ServiNOA © {anoActualAR()}</p>
        </Card>

      </div>
    </div>
  );
}