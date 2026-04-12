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
  Activity,
  Users,
  Box,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { GlobalNoteForm } from "./GlobalNoteForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FinanceChartConfigurable } from "@/components/ui/FinanceChartConfigurable";
import { WorkshopChart } from "@/components/ui/WorkshopChart";
import { Card, StatCard } from "@/components/ui/Card";
import { 
  obtenerSaldosCajas, 
  calcularCapitalCajas, 
  calcularSaldoEnCalle, 
  calcularPatrimonioTotal 
} from "@/lib/financeUtils";
import { SortableEquipos } from "./SortableEquipos";
import { SortableTareas } from "./SortableTareas";
import { SortableAlertas } from "./SortableAlertas";
import { UnifiedDashboardPanel } from "@/components/dashboard/UnifiedDashboardPanel";
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
        gte: new Date(inicioMesStd.getTime() - 10 * 24 * 60 * 60 * 1000),
        lte: new Date(finMesStd.getTime() + 10 * 24 * 60 * 60 * 1000)
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

  // 6. Capital Total del Sistema (Histórico) - Usando utilidad unificada
  const capitalTotal = await calcularCapitalCajas();

  // 6c. Saldo en Calle (Deuda de clientes) - Usando utilidad unificada
  const saldoEnCalle = await calcularSaldoEnCalle();

  const totalPatrimonio = capitalTotal + saldoEnCalle;

  // Cajas para el desglose lateral
  const cajasConSaldo = await obtenerSaldosCajas();

  // 7. Gráfico e Historial Taller (Inicialmente "Total")
  const fetchInitialChartData = async () => {
    // Reutilizamos la lógica del API para el SSR inicial (modo "total")
    const [movs, ots] = await Promise.all([
      prisma.movimientoCaja.findMany({ select: { fecha: true, ingreso: true, egreso: true }, orderBy: { fecha: 'asc' } }),
      prisma.ordenTrabajo.findMany({ select: { fechaRecepcion: true }, orderBy: { fechaRecepcion: 'asc' } })
    ]);
    
    if (movs.length === 0 && ots.length === 0) return { finance: [], workshop: { chartData: [], topClientes: [] } };

    const firstDateRaw = movs[0]?.fecha || ots[0]?.fechaRecepcion || new Date();
    const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number; ots: number }>();
    let curr = new Date(firstDateRaw);
    curr.setDate(1);
    while (curr <= hoy) {
      const k = `${curr.getFullYear()}-${curr.getMonth()}`;
      buckets.set(k, { fecha: `${mesesLabels[curr.getMonth()]} ${String(curr.getFullYear()).slice(2)}`, ingresos: 0, egresos: 0, ots: 0 });
      curr.setMonth(curr.getMonth() + 1);
    }
    movs.forEach(m => {
      const p = adjustDateForBusinessCycle(new Date(m.fecha));
      const b = buckets.get(`${p.getFullYear()}-${p.getMonth()}`);
      if (b) { b.ingresos += m.ingreso || 0; b.egresos += m.egreso || 0; }
    });
    ots.forEach(ot => {
      const b = buckets.get(`${ot.fechaRecepcion.getFullYear()}-${ot.fechaRecepcion.getMonth()}`);
      if (b) b.ots++;
    });

    const rawTop = await prisma.ordenTrabajo.groupBy({
      by: ['clienteId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });
    const clienteNames = await prisma.cliente.findMany({
      where: { id: { in: rawTop.map(r => r.clienteId) } },
      select: { id: true, nombre: true }
    });

    return {
      finance: Array.from(buckets.values()),
      workshop: {
        chartData: Array.from(buckets.values()).map(b => ({ label: b.fecha, valor: b.ots })),
        topClientes: rawTop.map(r => ({
          nombre: clienteNames.find(n => n.id === r.clienteId)?.nombre || 'Desconocido',
          cantidad: r._count.id
        }))
      }
    };
  };

  const initialStats = await fetchInitialChartData();

  // Distribución Crítica (Inamovible)
  const estadosCriticos = await prisma.ordenTrabajo.groupBy({
    by: ['estado'],
    where: { estado: { in: ['PARA_PRESUPUESTAR', 'EN_REVISION', 'APROBADO', 'EN_REPARACION'] } },
    _count: { id: true }
  });

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

      {/* Panel Estadístico Unificado */}
      {canSeeFinances && (
        <UnifiedDashboardPanel 
          initialFinanceData={initialStats.finance}
          initialWorkshopData={initialStats.workshop}
          initialPeriodo="total"
        />
      )}

      {/* Grid de Operaciones en Tiempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Panel Izquierdo: Resúmenes Rápidos */}
        <div className="lg:col-span-4 space-y-8">
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
            title="Estado Actual del Taller"
            icon={<ClipboardList size={20} className="text-gray-900" />}
            subtitle="Equipos en proceso crítico"
          >
             <div className="grid grid-cols-2 gap-4">
                {estadosCriticos.map(e => (
                   <div key={e.estado} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center hover:bg-white hover:shadow-sm transition-all group">
                      <span className="text-2xl font-black text-gray-900 group-hover:text-red-600 transition-colors">{e._count.id}</span>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center mt-1 leading-tight">
                        {e.estado.replace(/_/g, ' ')}
                      </span>
                   </div>
                ))}
             </div>
          </Card>

          <Card
            title="Alertas de Seguimiento"
            icon={<Bell size={20} className="text-red-600" />}
            className="border border-gray-200 rounded-2xl shadow-sm"
          >
            <SortableAlertas seguimientos={seguimientos.map(s => ({ ...s, fecha: s.fecha }))} />
          </Card>
        </div>

        {/* Panel Derecho: Listados Activos */}
        <div className="lg:col-span-8 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card
                title="Tareas Pendientes"
                icon={<Target size={20} className="text-gray-900" />}
                action={<span className="text-[10px] font-bold bg-gray-900 text-white px-3 py-1 rounded-md">{misTareas.length}</span>}
                className="rounded-2xl shadow-sm border border-gray-200"
              >
                <SortableTareas tareas={misTareas.map(t => ({ ...t }))} hoy={hoy.toISOString()} />
              </Card>

              <Card
                title="Comunicaciones"
                icon={<MessageSquare size={20} className="text-gray-900" />}
                className="rounded-2xl shadow-sm border border-gray-200"
              >
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <GlobalNoteForm initialNote={notaGlobal?.valor || ""} />
                </div>
                <p className="text-[9px] text-gray-400 font-medium text-center mt-6 uppercase tracking-widest">ServiNOA © {anoActualAR()}</p>
              </Card>
           </div>

           <Card
            title="Equipos en Taller (OTs Activas)"
            icon={<Wrench size={20} className="text-gray-900" />}
            action={<span className="text-[10px] font-bold border border-gray-200 px-3 py-1 rounded-md text-gray-500">{otsEnProceso.length} activas</span>}
            className="rounded-2xl shadow-sm border border-gray-200"
          >
            <SortableEquipos ots={otsEnProceso.map(ot => ({ ...ot }))} hoy={hoy.toISOString()} />
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