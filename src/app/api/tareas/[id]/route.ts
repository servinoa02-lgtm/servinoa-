import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tareaService } from "@/services/tareaService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { estado } = await req.json();
    const tarea = await tareaService.cambiarEstado(id, estado);
    return NextResponse.json(tarea);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

