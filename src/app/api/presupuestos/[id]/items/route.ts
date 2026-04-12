import { NextRequest, NextResponse } from "next/server";
import { presupuestoService } from "@/services/presupuestoService";
import { requireAuth } from "@/lib/requireAuth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un ítem" }, { status: 400 });
    }

    await presupuestoService.actualizarItems(id, items);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Error al actualizar items" }, { status: 500 });
  }
}
