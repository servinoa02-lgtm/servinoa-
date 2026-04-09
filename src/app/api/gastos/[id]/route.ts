import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth(["ADMIN", "CAJA"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const gasto = await tx.gasto.findUnique({ where: { id } });
      if (!gasto) throw new Error("Gasto no encontrado");

      await tx.movimientoCaja.deleteMany({ where: { gastoId: id } });
      await tx.gasto.delete({ where: { id } });
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
