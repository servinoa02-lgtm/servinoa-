import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      // Guardar info antes de eliminar
      const cobranza = await tx.cobranza.findUnique({
        where: { id },
        select: { presupuestoId: true, importe: true },
      });
      if (!cobranza) throw new Error("Cobranza no encontrada");

      // Eliminar entradas relacionadas
      await tx.cuentaCorriente.deleteMany({ where: { cobranzaId: id } });
      await tx.movimientoCaja.deleteMany({ where: { cobranzaId: id } });
      await tx.cobranza.delete({ where: { id } });

      // Recalcular estadoCobro del presupuesto asociado
      if (cobranza.presupuestoId) {
        const ppto = await tx.presupuesto.findUnique({
          where: { id: cobranza.presupuestoId },
          include: {
            items: true,
            cobranzas: { select: { importe: true } },
          },
        });
        if (ppto) {
          const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
          const total = ppto.incluyeIva ? subtotal * 1.21 : subtotal;
          const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
          const estadoCobro =
            cobrado <= 0
              ? "COBRO_PENDIENTE"
              : cobrado >= total
              ? "COBRADO"
              : "PARCIAL";
          await tx.presupuesto.update({
            where: { id: ppto.id },
            data: { estadoCobro: estadoCobro as "COBRADO" | "COBRO_PENDIENTE" | "PARCIAL" },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar cobranza" },
      { status: 500 }
    );
  }
}
