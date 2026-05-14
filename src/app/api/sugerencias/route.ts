import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const [fallasRows, accesoriosRows] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      select: { falla: true },
      distinct: ["falla"],
      where: { falla: { not: null } },
      orderBy: { falla: "asc" },
    }),
    prisma.ordenTrabajo.findMany({
      select: { accesorios: true },
      distinct: ["accesorios"],
      where: { accesorios: { not: null } },
      orderBy: { accesorios: "asc" },
    }),
  ]);

  return NextResponse.json({
    fallas: fallasRows.map((o) => o.falla).filter(Boolean) as string[],
    accesorios: accesoriosRows.map((o) => o.accesorios).filter(Boolean) as string[],
  });
}