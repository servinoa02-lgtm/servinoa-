import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAJAS_DEFAULT = ["Pablo", "Julio", "Nico", "Servinoa", "Cheques", "Retenciones", "Macro", "Mercado Pago"];

export async function GET() {
  try {
    // Auto-crear cajas si no existen
    for (const nombre of CAJAS_DEFAULT) {
      await prisma.caja.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      });
    }

    const cajas = await prisma.caja.findMany({
      include: {
        movimientos: {
          select: { ingreso: true, egreso: true },
        },
      },
    });

    const data = cajas.map((c) => {
      const saldo = c.movimientos.reduce((sum, m) => sum + m.ingreso - m.egreso, 0);
      return { ...c, saldo, movimientos: undefined };
    });

    // Ordenar según el orden definido
    data.sort((a, b) => {
      const ia = CAJAS_DEFAULT.indexOf(a.nombre);
      const ib = CAJAS_DEFAULT.indexOf(b.nombre);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cajas" }, { status: 500 });
  }
}
