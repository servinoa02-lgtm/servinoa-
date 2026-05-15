import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth(["ADMIN", "JEFE"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const gasto = await tx.gasto.findUnique({ where: { id } });
      if (!gasto) throw new Error("Gasto no encontrado");

      // Liberar o eliminar cheques asociados al gasto
      const movimientos = await tx.movimientoCaja.findMany({
        where: { gastoId: id },
        select: { chequeId: true },
      });
      const chequeIds = movimientos.map(m => m.chequeId).filter(Boolean) as string[];

      await tx.movimientoCaja.deleteMany({ where: { gastoId: id } });
      await tx.gasto.delete({ where: { id } });

      for (const chequeId of chequeIds) {
        // En un futuro, si el gasto emitía un cheque propio, podríamos eliminarlo.
        // Si el gasto usó un cheque de terceros (endosado), lo devolvemos a EN_CARTERA.
        // Por defecto, lo devolvemos a cartera para no perder plata.
        await tx.cheque.update({
          where: { id: chequeId },
          data: { estado: "EN_CARTERA" },
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar gasto" },
      { status: 500 }
    );
  }
}
