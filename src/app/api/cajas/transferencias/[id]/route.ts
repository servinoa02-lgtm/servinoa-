import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["ADMIN", "JEFE"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const transferencia = await tx.transferenciaCaja.findUnique({
        where: { id },
      });
      if (!transferencia) throw new Error("Transferencia no encontrada");

      // Eliminar los movimientos de caja asociados a esta transferencia
      await tx.movimientoCaja.deleteMany({
        where: { transferenciaId: id }
      });

      // Eliminar la transferencia
      await tx.transferenciaCaja.delete({
        where: { id },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar la transferencia" },
      { status: 500 }
    );
  }
}
