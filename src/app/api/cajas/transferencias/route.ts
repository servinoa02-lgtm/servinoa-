import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const transferencias = await prisma.transferenciaCaja.findMany({
      include: {
        cajaOrigen: { select: { nombre: true } },
        cajaDestino: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(transferencias);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cajaOrigenId, cajaDestinoId, monto, descripcion, formaPagoOrigen, formaPagoDestino } = body;

    const transferencia = await prisma.transferenciaCaja.create({
      data: {
        cajaOrigenId,
        cajaDestinoId,
        monto: parseFloat(monto),
        descripcion: descripcion || null,
        formaPagoOrigen: formaPagoOrigen || "Efectivo",
        formaPagoDestino: formaPagoDestino || "Efectivo",
      },
      include: {
        cajaOrigen: { select: { nombre: true } },
        cajaDestino: { select: { nombre: true } },
      },
    });

    // Registrar egreso en origen
    await prisma.movimientoCaja.create({
      data: {
        cajaId: cajaOrigenId,
        descripcion: `Transferencia a ${transferencia.cajaDestino.nombre}${descripcion ? ` - ${descripcion}` : ""}`,
        ingreso: 0,
        egreso: parseFloat(monto),
        formaPago: formaPagoOrigen || "Efectivo",
      },
    });

    // Registrar ingreso en destino
    await prisma.movimientoCaja.create({
      data: {
        cajaId: cajaDestinoId,
        descripcion: `Transferencia desde ${transferencia.cajaOrigen.nombre}${descripcion ? ` - ${descripcion}` : ""}`,
        ingreso: parseFloat(monto),
        egreso: 0,
        formaPago: formaPagoDestino || "Efectivo",
      },
    });

    return NextResponse.json(transferencia);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear transferencia" }, { status: 500 });
  }
}
