import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const caja = await prisma.caja.findUnique({
      where: { id },
      include: {
        movimientos: {
          orderBy: { fecha: "asc" },
        },
      },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    // Calcular saldo acumulado
    let saldoAcum = 0;
    const movimientosConSaldo = caja.movimientos.map((m) => {
      saldoAcum += m.ingreso - m.egreso;
      return { ...m, saldoAcum };
    });

    const saldo = caja.movimientos.reduce((sum, m) => sum + m.ingreso - m.egreso, 0);

    return NextResponse.json({
      ...caja,
      movimientos: movimientosConSaldo.reverse(),
      saldo,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { tipo, descripcion, importe, formaPago } = body;

    const movimiento = await prisma.movimientoCaja.create({
      data: {
        cajaId: id,
        descripcion,
        ingreso: tipo === "ingreso" ? parseFloat(importe) : 0,
        egreso: tipo === "egreso" ? parseFloat(importe) : 0,
        formaPago: formaPago || "Efectivo",
      },
    });

    return NextResponse.json(movimiento);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear movimiento" }, { status: 500 });
  }
}
