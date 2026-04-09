import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET() {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

  try {
    const cheques = await prisma.cheque.findMany({
      include: {
        cliente: { include: { empresa: true } },
      },
      orderBy: { fechaIngreso: "desc" },
    });

    const hoy = new Date();
    const data = cheques.map((c) => {
      let diasVencimiento: number | null = null;
      let vencimientoTexto = "";
      if (c.fechaCobro) {
        const diff = Math.floor((c.fechaCobro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        diasVencimiento = diff;
        if (diff < 0) {
          vencimientoTexto = `VENCIDO hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`;
        } else if (diff === 0) {
          vencimientoTexto = "Vence HOY";
        } else {
          vencimientoTexto = `Vence en ${diff} día${diff !== 1 ? "s" : ""}`;
        }
      }
      return { ...c, diasVencimiento, vencimientoTexto };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cheques" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "CAJA"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    const cheque = await prisma.cheque.create({
      data: {
        clienteId: body.clienteId || null,
        numeroCheque: body.numeroCheque || null,
        banco: body.banco || null,
        librador: body.librador || null,
        importe: parseFloat(body.importe),
        fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : null,
        fechaCobro: body.fechaCobro ? new Date(body.fechaCobro) : null,
        endosadoA: body.endosadoA || null,
        descripcion: body.descripcion || null,
        estado: body.estado || "EN_CARTERA",
      },
      include: {
        cliente: { include: { empresa: true } },
      },
    });
    return NextResponse.json(cheque);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cheque" }, { status: 500 });
  }
}
