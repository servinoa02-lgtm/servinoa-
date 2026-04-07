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
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { GlobalNoteForm } from "./GlobalNoteForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FinanceChart } from "@/components/ui/FinanceChart";
import { Card, StatCard } from "@/components/ui/Card";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any)?.id;
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
    where: { esSeguimiento: true, orden: { estado: { notIn: ["ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR", "RECHAZADO"] } } },
    include: { orden: { select: { numero: true, id: true, cliente: { select: { nombre: true } } } } },
    orderBy: { fecha: "desc" }
  });

  // 4. Configuración: Nota Global
  const notaGlobal = await prisma.configuracion.findUnique({
    where: { clave: "NOTA_GLOBAL" }
  });

  // 5. Vencimientos: Cheques
  const chequesCartera = await prisma.cheque.findMany({
    where: { estado: "EN_CARTERA" },
    orderBy: { fechaCobro: "asc" }
  });
  
  const chequesVencidosOProximos = chequesCartera.filter(c => {
    if (!c.fechaCobro) return false;
    const diasDif = Math.ceil((c.fechaCobro.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
    return diasDif <= 7;
  });

  // 6. Resumen Financiero Mes Actual
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  const movsCaja = await prisma.movimientoCaja.aggregate({
    where: { fecha: { gte: inicioMes, lte: finMes } },
    _sum: { ingreso: true, egreso: true }
  });
  const mesIngresos = movsCaja._sum.ingreso || 0;
  const mesEgresos = movsCaja._sum.egreso || 0;
  const mesBalance = mesIngresos - mesEgresos;

  // 7. Gráfico: últimos 30 días
  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 29);
  hace30.setHours(0, 0, 0, 0);

  const movs30 = await prisma.movimientoCaja.findMany({
    where: { fecha: { gte: hace30 } },
    select: { fecha: true, ingreso: true, egreso: true },
    orderBy: { fecha: "asc" },
  });

  const dayMap = new Map<string, { ingresos: number; egresos: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(hace30);
    d.setDate(hace30.getDate() + i);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    dayMap.set(key, { ingresos: 0, egresos: 0 });
  }
  for (const m of movs30) {
    const d = new Date(m.fecha);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = dayMap.get(key);
    if (existing) {
      existing.ingresos += m.ingreso || 0;
      existing.egresos += m.egreso || 0;
    }
  }
  const chartData = Array.from(dayMap.entries()).map(([fecha, v]) => ({
    fecha,
    ingresos: v.ingresos,
    egresos: v.egresos,
  }));

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
      
      {/* Header Info */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-1">Escritorio Central</h2>
          <p className="text-slate-500 font-medium tracking-tight">Control operativo ServiNOA.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <Clock size={18} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-300">{hoy.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>
        
      {/* RESUMEN FINANCIERO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Ingresos del Mes"
          value={`$${mesIngresos.toLocaleString("es-AR")}`}
          icon={<TrendingUp size={22} />}
          color="emerald"
        />
        <StatCard 
          label="Egresos del Mes"
          value={`$${mesEgresos.toLocaleString("es-AR")}`}
          icon={<TrendingDown size={22} />}
          color="rose"
        />
        <StatCard 
          label="Balance Total"
          value={`$${mesBalance.toLocaleString("es-AR")}`}
          icon={<DollarSign size={22} />}
          color={mesBalance >= 0 ? "primary" : "rose"}
          trend={{ value: "Evolutivo", positive: true }}
        />
      </div>

      {/* GRÁFICO PRINCIPAL */}
      <Card 
        title="Tendencia de Operaciones" 
        subtitle="Ingresos vs Egresos — últimos 30 días"
        icon={<BarChart2 size={18} />}
        action={<Link href="/cajas" className="text-xs font-bold text-brand-primary hover:underline">Ver detalles completos</Link>}
      >
        <FinanceChart data={chartData} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* Tareas Asignadas */}
        <Card 
          title="Mis Tareas" 
          icon={<CheckCircle size={18} />}
          action={<span className="text-[10px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 uppercase">{misTareas.length}</span>}
        >
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {misTareas.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 font-medium">Sin tareas pendientes.</p>
              </div>
            ) : (
              misTareas.map(t => {
                const isVencida = t.vencimiento && t.vencimiento < hoy;
                return (
                  <Link key={t.id} href="/tareas" className="block group">
                    <div className={`p-4 rounded-2xl border transition-all ${isVencida ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <StatusBadge status={isVencida ? 'VENCIDO' : t.prioridad} />
                        {t.vencimiento && <span className={`text-[10px] font-bold ${isVencida ? 'text-rose-400' : 'text-slate-500'}`}>{t.vencimiento.toLocaleDateString('es-AR')}</span>}
                      </div>
                      <p className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors capitalize">{t.descripcion.toLowerCase()}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        {/* Equipos en Taller */}
        <Card 
          title="Monitoreo de Taller" 
          subtitle="Equipos en proceso activo"
          icon={<Wrench size={18} />}
          action={<span className="text-[10px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 uppercase">{otsEnProceso.length}</span>}
        >
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {otsEnProceso.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 font-medium">No hay órdenes activas.</p>
            ) : (
              otsEnProceso.map(ot => (
                <Link key={ot.id} href={`/ordenes/${ot.id}`} className="block p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-white group-hover:text-brand-primary transition-colors uppercase tracking-wider">#{ot.numero}</span>
                    <StatusBadge status={ot.estado} className="scale-90" />
                  </div>
                  <div className="text-xs font-bold text-slate-500 mb-2 truncate">{ot.cliente.nombre}</div>
                  {ot.fechaEstimadaEntrega && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase">
                      Compromiso: <span className={ot.fechaEstimadaEntrega < hoy ? "text-rose-400" : "text-slate-400"}>{ot.fechaEstimadaEntrega.toLocaleDateString("es-AR")}</span>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Seguimientos y Avisos */}
        <div className="space-y-6">
          <Card 
            title="Seguimientos Críticos" 
            icon={<AlertTriangle size={18} />}
            className="border-rose-500/20"
          >
            <div className="space-y-3">
              {seguimientos.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium text-center py-4">Sin alertas pendientes.</p>
              ) : (
                seguimientos.map(s => (
                  <Link key={s.id} href={`/ordenes/${s.orden.id}`} className="block p-3 rounded-xl bg-rose-500/[0.03] border border-rose-500/10 hover:bg-rose-500/[0.07] transition-all">
                    <div className="text-[10px] font-black text-rose-400 mb-1 uppercase tracking-widest flex items-center justify-between">
                      OT #{s.orden.numero} — {s.orden.cliente.nombre}
                      <ExternalLink size={10} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed italic">"{s.texto}"</p>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card 
            title="Avisos del Equipo" 
            icon={<MessageSquare size={18} />}
            className="flex-1"
          >
            <GlobalNoteForm initialNote={notaGlobal?.valor || ""} />
          </Card>
        </div>

      </div>
    </div>
  );
}