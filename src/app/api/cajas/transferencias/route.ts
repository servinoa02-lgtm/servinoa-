import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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
  const session = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const { cajaOrigenId, cajaDestinoId, monto, descripcion, formaPagoOrigen, formaPagoDestino } = body;

    // ─── Validaciones ───
    const montoNum = parseFloat(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número mayor a 0" },
        { status: 400 }
      );
    }
    if (!cajaOrigenId || !cajaDestinoId) {
      return NextResponse.json(
        { error: "Debe seleccionar caja de origen y caja de destino" },
        { status: 400 }
      );
    }
    if (cajaOrigenId === cajaDestinoId) {
      return NextResponse.json(
        { error: "La caja de origen y destino no pueden ser la misma" },
        { status: 400 }
      );
    }

    // ─── Todo en una sola transacción para evitar plata duplicada o perdida ───
    const transferencia = await prisma.$transaction(async (tx) => {
      const nuevaTransferencia = await tx.transferenciaCaja.create({
        data: {
          cajaOrigenId,
          cajaDestinoId,
          monto: montoNum,
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
      await tx.movimientoCaja.create({
        data: {
          cajaId: cajaOrigenId,
          descripcion: `Transferencia a ${nuevaTransferencia.cajaDestino.nombre}${descripcion ? ` - ${descripcion}` : ""}`,
          ingreso: 0,
          egreso: montoNum,
          formaPago: formaPagoOrigen || "Efectivo",
        },
      });

      // Registrar ingreso en destino
      await tx.movimientoCaja.create({
        data: {
          cajaId: cajaDestinoId,
          descripcion: `Transferencia desde ${nuevaTransferencia.cajaOrigen.nombre}${descripcion ? ` - ${descripcion}` : ""}`,
          ingreso: montoNum,
          egreso: 0,
          formaPago: formaPagoDestino || "Efectivo",
        },
      });

      return nuevaTransferencia;
    });

    return NextResponse.json(transferencia);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear transferencia" }, { status: 500 });
  }
}
