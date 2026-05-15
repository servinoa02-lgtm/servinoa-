import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { calcularTotalConIVA } from "@/lib/constants";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth(["ADMIN", "JEFE"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      // Guardar info antes de eliminar
      const cobranza = await tx.cobranza.findUnique({
        where: { id },
        select: { presupuestoId: true, importe: true, chequeId: true },
      });
      if (!cobranza) throw new Error("Cobranza no encontrada");

      // Eliminar entradas relacionadas en orden correcto
      await tx.cuentaCorriente.deleteMany({ where: { cobranzaId: id } });
      await tx.movimientoCaja.deleteMany({ where: { cobranzaId: id } });
      await tx.cobranza.delete({ where: { id } });

      // Si la cobranza tenía cheque asociado, eliminarlo también (A MENOS QUE ESTÉ RECHAZADO)
      if (cobranza.chequeId) {
        const cheque = await tx.cheque.findUnique({ where: { id: cobranza.chequeId } });
        if (cheque?.estado === "RECHAZADO") {
           // Conservar el cheque por historial, pero actualizar su descripción
           await tx.cheque.update({
             where: { id: cobranza.chequeId },
             data: { descripcion: `${cheque.descripcion || ''} (Cobranza Anulada)` }
           });
        } else {
           await tx.cheque.delete({ where: { id: cobranza.chequeId } });
        }
      }

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
          const total = calcularTotalConIVA(subtotal, ppto.incluyeIva);
          const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
          const estadoCobro =
            cobrado <= 0
              ? "COBRO_PENDIENTE"
              : cobrado >= total - 0.02
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
