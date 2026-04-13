import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { adjustDateForBusinessCycle } from "@/lib/businessCycle";

const TZ = "America/Argentina/Buenos_Aires";

function getARParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month") - 1, day: get("day") };
}

// Returns the UTC Date that represents 00:00 AR for a given (y,m,d) AR date
function arMidnightUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 3, 0, 0));
}

// Get year/month/day in AR for a given UTC date
function getARPartsFromDate(d: Date) {
  return getARParts(d);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const role = (session.user as any).rol;
  if (!["ADMIN", "JEFE", "ADMINISTRACION"].includes(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const periodo = (req.nextUrl.searchParams.get("periodo") || "dia") as
    | "dia"
    | "mes"
    | "ano"
    | "total"
    | "custom";
  const diasCustom = Math.max(1, Math.min(3650, parseInt(req.nextUrl.searchParams.get("dias") || "90")));

  const today = getARParts();

  // Helper to fetch Top Clientes for a period
  const fetchTopClientes = async (start?: Date) => {
    const raw = await prisma.ordenTrabajo.groupBy({
      by: ['clienteId'],
      where: start ? { fechaRecepcion: { gte: start } } : {},
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });
    const nombres = await prisma.cliente.findMany({
      where: { id: { in: raw.map(r => r.clienteId) } },
      select: { id: true, nombre: true }
    });
    return raw.map(r => ({
      nombre: nombres.find(n => n.id === r.clienteId)?.nombre || 'Desconocido',
      cantidad: r._count.id
    }));
  };

  if (periodo === "total") {
    const [movs, ots] = await Promise.all([
      prisma.movimientoCaja.findMany({ select: { fecha: true, ingreso: true, egreso: true }, orderBy: { fecha: 'asc' } }),
      prisma.ordenTrabajo.findMany({ select: { fechaRecepcion: true }, orderBy: { fechaRecepcion: 'asc' } })
    ]);
    
    if (movs.length === 0 && ots.length === 0) return NextResponse.json({ data: [], workshop: { chartData: [], topClientes: [] } });

    const firstDateRaw = movs[0]?.fecha || ots[0]?.fechaRecepcion || new Date();
    const firstParts = getARPartsFromDate(new Date(firstDateRaw));
    const lastParts = getARParts();

    const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number; ots: number }>();

    let currY = firstParts.year;
    let currM = firstParts.month;
    while (currY < lastParts.year || (currY === lastParts.year && currM <= lastParts.month)) {
      buckets.set(`${currY}-${currM}`, { fecha: `${mesesLabels[currM]} ${String(currY).slice(2)}`, ingresos: 0, egresos: 0, ots: 0 });
      currM++; if (currM > 11) { currM = 0; currY++; }
    }

    movs.forEach(m => {
      const p = getARPartsFromDate(adjustDateForBusinessCycle(new Date(m.fecha)));
      const b = buckets.get(`${p.year}-${p.month}`);
      if (b) { b.ingresos += m.ingreso || 0; b.egresos += m.egreso || 0; }
    });
    ots.forEach(ot => {
      const p = getARPartsFromDate(new Date(ot.fechaRecepcion));
      const b = buckets.get(`${p.year}-${p.month}`);
      if (b) b.ots++;
    });

    const topClientes = await fetchTopClientes();
    return NextResponse.json({ 
      data: Array.from(buckets.values()), 
      workshop: { chartData: Array.from(buckets.values()).map(b => ({ label: b.fecha, valor: b.ots })), topClientes } 
    });
  }

  if (periodo === "dia") {
    const start = arMidnightUTC(today.year, today.month, today.day - 29);
    const [movs, ots] = await Promise.all([
      prisma.movimientoCaja.findMany({ where: { fecha: { gte: start } }, select: { fecha: true, ingreso: true, egreso: true } }),
      prisma.ordenTrabajo.findMany({ where: { fechaRecepcion: { gte: start } }, select: { fechaRecepcion: true } })
    ]);

    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number; ots: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const p = getARPartsFromDate(d);
      buckets.set(`${p.year}-${p.month}-${p.day}`, { 
        fecha: `${String(p.day).padStart(2, "0")}/${String(p.month + 1).padStart(2, "0")}`, 
        ingresos: 0, egresos: 0, ots: 0 
      });
    }

    movs.forEach(m => {
      const p = getARPartsFromDate(new Date(m.fecha));
      const b = buckets.get(`${p.year}-${p.month}-${p.day}`);
      if (b) { b.ingresos += m.ingreso || 0; b.egresos += m.egreso || 0; }
    });
    ots.forEach(ot => {
      const p = getARPartsFromDate(new Date(ot.fechaRecepcion));
      const b = buckets.get(`${p.year}-${p.month}-${p.day}`);
      if (b) b.ots++;
    });

    const topClientes = await fetchTopClientes(start);
    return NextResponse.json({ 
      data: Array.from(buckets.values()),
      workshop: { chartData: Array.from(buckets.values()).map(b => ({ label: b.fecha, valor: b.ots })), topClientes }
    });
  }

  if (periodo === "mes") {
    const start = arMidnightUTC(today.year, today.month, 1);
    const [movs, ots] = await Promise.all([
      prisma.movimientoCaja.findMany({ where: { fecha: { gte: start } }, select: { fecha: true, ingreso: true, egreso: true } }),
      prisma.ordenTrabajo.findMany({ where: { fechaRecepcion: { gte: start } }, select: { fechaRecepcion: true } })
    ]);

    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number; ots: number }>();
    for (let i = 0; i < today.day; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const p = getARPartsFromDate(d);
      buckets.set(`${p.year}-${p.month}-${p.day}`, { 
        fecha: `${String(p.day).padStart(2, "0")}/${String(p.month + 1).padStart(2, "0")}`, 
        ingresos: 0, egresos: 0, ots: 0 
      });
    }

    movs.forEach(m => {
      const p = getARPartsFromDate(new Date(m.fecha));
      const b = buckets.get(`${p.year}-${p.month}-${p.day}`);
      if (b) { b.ingresos += m.ingreso || 0; b.egresos += m.egreso || 0; }
    });
    ots.forEach(ot => {
      const p = getARPartsFromDate(new Date(ot.fechaRecepcion));
      const b = buckets.get(`${p.year}-${p.month}-${p.day}`);
      if (b) b.ots++;
    });

    const topClientes = await fetchTopClientes(start);
    return NextResponse.json({ 
      data: Array.from(buckets.values()),
      workshop: { chartData: Array.from(buckets.values()).map(b => ({ label: b.fecha, valor: b.ots })), topClientes }
    });
  }

  if (periodo === "ano") {
    const start = arMidnightUTC(today.year, 0, 1);
    const [movs, ots] = await Promise.all([
      prisma.movimientoCaja.findMany({ where: { fecha: { gte: start } }, select: { fecha: true, ingreso: true, egreso: true } }),
      prisma.ordenTrabajo.findMany({ where: { fechaRecepcion: { gte: start } }, select: { fechaRecepcion: true } })
    ]);

    const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number; ots: number }>();
    for (let m = 0; m <= today.month; m++) {
      buckets.set(`${today.year}-${m}`, { fecha: mesesLabels[m], ingresos: 0, egresos: 0, ots: 0 });
    }

    movs.forEach(m => {
      const adjusted = adjustDateForBusinessCycle(new Date(m.fecha));
      const p = getARPartsFromDate(adjusted);
      const b = buckets.get(`${p.year}-${p.month}`);
      if (b) { b.ingresos += m.ingreso || 0; b.egresos += m.egreso || 0; }
    });
    ots.forEach(ot => {
      const p = getARPartsFromDate(new Date(ot.fechaRecepcion));
      const b = buckets.get(`${p.year}-${p.month}`);
      if (b) b.ots++;
    });

    const topClientes = await fetchTopClientes(start);
    return NextResponse.json({ 
      data: Array.from(buckets.values()),
      workshop: { chartData: Array.from(buckets.values()).map(b => ({ label: b.fecha, valor: b.ots })), topClientes }
    });
  }

  if (periodo === "custom") {
    const start = new Date(Date.now() - diasCustom * 24 * 60 * 60 * 1000);
    const [movs, ots] = await Promise.all([
      prisma.movimientoCaja.findMany({ where: { fecha: { gte: start } }, select: { fecha: true, ingreso: true, egreso: true } }),
      prisma.ordenTrabajo.findMany({ where: { fechaRecepcion: { gte: start } }, select: { fechaRecepcion: true } })
    ]);

    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number; ots: number }>();
    for (let i = 0; i < diasCustom; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const p = getARPartsFromDate(d);
      const key = `${p.year}-${p.month}-${p.day}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          fecha: `${String(p.day).padStart(2, "0")}/${String(p.month + 1).padStart(2, "0")}`,
          ingresos: 0, egresos: 0, ots: 0
        });
      }
    }

    movs.forEach(m => {
      const p = getARPartsFromDate(new Date(m.fecha));
      const b = buckets.get(`${p.year}-${p.month}-${p.day}`);
      if (b) { b.ingresos += m.ingreso || 0; b.egresos += m.egreso || 0; }
    });
    ots.forEach(ot => {
      const p = getARPartsFromDate(new Date(ot.fechaRecepcion));
      const b = buckets.get(`${p.year}-${p.month}-${p.day}`);
      if (b) b.ots++;
    });

    const topClientes = await fetchTopClientes(start);
    return NextResponse.json({
      data: Array.from(buckets.values()),
      workshop: { chartData: Array.from(buckets.values()).map(b => ({ label: b.fecha, valor: b.ots })), topClientes }
    });
  }

  return NextResponse.json({ error: "periodo invalido" }, { status: 400 });
}
