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
    | "total";

  const today = getARParts();

  if (periodo === "total") {
    // Toda la historia, agrupada por mes
    const movs = await prisma.movimientoCaja.findMany({
      select: { fecha: true, ingreso: true, egreso: true },
      orderBy: { fecha: 'asc' }
    });
    
    if (movs.length === 0) return NextResponse.json({ data: [] });

    const firstMov = getARPartsFromDate(new Date(movs[0].fecha));
    const lastMov = getARParts(); // Hasta hoy

    const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number }>();

    // Pre-poblar todos los meses entre el primero y hoy para evitar gaps
    let currY = firstMov.year;
    let currM = firstMov.month;

    while (currY < lastMov.year || (currY === lastMov.year && currM <= lastMov.month)) {
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

    for (const m of movs) {
      const adjusted = adjustDateForBusinessCycle(new Date(m.fecha));
      const p = getARPartsFromDate(adjusted);
      const k = `${p.year}-${p.month}`;
      const b = buckets.get(k);
      if (b) {
        b.ingresos += m.ingreso || 0;
        b.egresos += m.egreso || 0;
      }
    }
    return NextResponse.json({ data: Array.from(buckets.values()) });
  }

  if (periodo === "dia") {
    // Últimos 30 días, agrupado por día
    const start = arMidnightUTC(today.year, today.month, today.day - 29);
    const movs = await prisma.movimientoCaja.findMany({
      where: { fecha: { gte: start } },
      select: { fecha: true, ingreso: true, egreso: true },
    });
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const p = getARPartsFromDate(d);
      const key = `${String(p.day).padStart(2, "0")}/${String(p.month + 1).padStart(2, "0")}`;
      buckets.set(`${p.year}-${p.month}-${p.day}`, { fecha: key, ingresos: 0, egresos: 0 });
    }
    for (const m of movs) {
      const p = getARPartsFromDate(new Date(m.fecha));
      const k = `${p.year}-${p.month}-${p.day}`;
      const b = buckets.get(k);
      if (b) {
        b.ingresos += m.ingreso || 0;
        b.egresos += m.egreso || 0;
      }
    }
    return NextResponse.json({ data: Array.from(buckets.values()) });
  }

  if (periodo === "mes") {
    // Mes actual desde el día 1, agrupado por día
    const start = arMidnightUTC(today.year, today.month, 1);
    const movs = await prisma.movimientoCaja.findMany({
      where: { fecha: { gte: start } },
      select: { fecha: true, ingreso: true, egreso: true },
    });

    // Calcular cuántos días tiene el mes hasta hoy
    const daysCount = today.day;
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number }>();
    
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const p = getARPartsFromDate(d);
      const key = `${String(p.day).padStart(2, "0")}/${String(p.month + 1).padStart(2, "0")}`;
      buckets.set(`${p.year}-${p.month}-${p.day}`, { fecha: key, ingresos: 0, egresos: 0 });
    }

    for (const m of movs) {
      const p = getARPartsFromDate(new Date(m.fecha));
      const k = `${p.year}-${p.month}-${p.day}`;
      const b = buckets.get(k);
      if (b) {
        b.ingresos += m.ingreso || 0;
        b.egresos += m.egreso || 0;
      }
    }
    return NextResponse.json({ data: Array.from(buckets.values()) });
  }

  if (periodo === "ano") {
    // Ejercicio comercial actual (desde 5 Ene), agrupado por mes
    // Incluidos los días 1-4 de Ene que se mueven al 5 Ene
    const start = arMidnightUTC(today.year, 0, 1);
    const movs = await prisma.movimientoCaja.findMany({
      where: { fecha: { gte: start } },
      select: { fecha: true, ingreso: true, egreso: true },
    });

    const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const buckets = new Map<string, { fecha: string; ingresos: number; egresos: number }>();
    
    // Poblamos los meses desde Enero hasta el mes actual
    for (let m = 0; m <= today.month; m++) {
      const k = `${today.year}-${m}`;
      buckets.set(k, {
        fecha: mesesLabels[m],
        ingresos: 0,
        egresos: 0
      });
    }

    for (const m of movs) {
      const adjusted = adjustDateForBusinessCycle(new Date(m.fecha));
      const p = getARPartsFromDate(adjusted);
      // Solo tomamos del año actual (por si acaso el adjustDate moviera algo raramente, aunque solo mueve dentro del año o al anterior para Dic 25)
      if (p.year === today.year) {
        const k = `${p.year}-${p.month}`;
        const b = buckets.get(k);
        if (b) {
          b.ingresos += m.ingreso || 0;
          b.egresos += m.egreso || 0;
        }
      }
    }
    return NextResponse.json({ data: Array.from(buckets.values()) });
  }

  return NextResponse.json({ error: "periodo invalido" }, { status: 400 });
}
