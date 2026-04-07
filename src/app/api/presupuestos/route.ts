import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const presupuestos = await prisma.presupuesto.findMany({
      include: {
        cliente: { include: { empresa: true } },
        orden: { select: { numero: true, id: true } },
        usuario: { select: { nombre: true } },
        items: true,
        cobranzas: { select: { importe: true } },
      },
      orderBy: { numero: "desc" },
    });

    const data = presupuestos.map((p) => {
      const subtotal = p.items.reduce((sum, item) => sum + item.total, 0);
      const total = p.incluyeIva ? subtotal * 1.21 : subtotal;
      const cobrado = p.cobranzas.reduce((sum, c) => sum + c.importe, 0);
      return { ...p, total, subtotal, cobrado, saldo: total - cobrado };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clienteId, ordenId, usuarioId, items, observaciones, incluyeIva, formaPago, validezDias, moneda } = body;

    const presupuesto = await prisma.presupuesto.create({
      data: {
        clienteId,
        ordenId: ordenId || null,
        usuarioId,
        observaciones: observaciones || null,
        incluyeIva: incluyeIva ?? true,
        formaPago: formaPago || "Contado",
        validezDias: validezDias || 7,
        moneda: moneda || "ARS",
        estado: "PRESUPUESTADO",
        estadoCobro: "APROBACION_PENDIENTE",
        items: {
          create: items.map((item: { cantidad: number; descripcion: string; precio: number }) => ({
            cantidad: item.cantidad,
            descripcion: item.descripcion,
            precio: item.precio,
            total: item.cantidad * item.precio,
          })),
        },
      },
      include: {
        cliente: { include: { empresa: true } },
        orden: { select: { numero: true, id: true } },
        usuario: { select: { nombre: true } },
        items: true,
      },
    });

    // Si tiene OT, cambiar estado OT a PRESUPUESTADO
    if (ordenId) {
      await prisma.ordenTrabajo.update({
        where: { id: ordenId },
        data: { estado: "PRESUPUESTADO" },
      });
    }

    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
  }
}
