import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    select: { falla: true, accesorios: true },
  });

  const fallas = [...new Set(ordenes.map((o) => o.falla).filter(Boolean))] as string[];
  const accesorios = [...new Set(ordenes.map((o) => o.accesorios).filter(Boolean))] as string[];

  return NextResponse.json({
    fallas: fallas.sort(),
    accesorios: accesorios.sort(),
  });
}