import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["ADMIN", "JEFE", "CAJA"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id },
    });

    if (!movimiento) {
      return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
    }

    // Proteger movimientos generados por el sistema (Gastos, Cobranzas, Transferencias)
    if (movimiento.gastoId || movimiento.cobranzaId || movimiento.transferenciaId) {
      return NextResponse.json(
        { error: "No se puede eliminar un movimiento vinculado a una transacción mayor (Gasto, Cobranza o Transferencia). Por favor elimine la transacción original." },
        { status: 400 }
      );
    }

    // Eliminar el movimiento manual
    await prisma.movimientoCaja.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar el movimiento manual" },
      { status: 500 }
    );
  }
}
