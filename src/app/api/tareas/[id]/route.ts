import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { tareaService } from "@/services/tareaService";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  try {
    const { estado } = await req.json();
    const tarea = await tareaService.cambiarEstado(id, estado);
    return NextResponse.json(tarea);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

