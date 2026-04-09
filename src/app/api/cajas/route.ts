import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

  try {
    const cajas = await prisma.caja.findMany({ orderBy: { nombre: "asc" } });

    const cajasConSaldo = await Promise.all(
      cajas.map(async (caja) => {
        const agg = await prisma.movimientoCaja.aggregate({
          where: { cajaId: caja.id },
          _sum: { ingreso: true, egreso: true },
        });
        const saldo = (agg._sum.ingreso || 0) - (agg._sum.egreso || 0);
        return { ...caja, saldo };
      })
    );

    return NextResponse.json(cajasConSaldo);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cajas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sesion = await requireAuth(["ADMIN"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    if (!body.nombre) return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });

    const caja = await prisma.caja.create({
      data: { nombre: body.nombre.trim().toUpperCase() }
    });

    return NextResponse.json(caja);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear caja" }, { status: 500 });
  }
}
