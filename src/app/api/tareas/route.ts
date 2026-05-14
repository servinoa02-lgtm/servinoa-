import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { tareaService } from "@/services/tareaService";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const user = session.user as { id?: string; rol?: string };
  const rolAdmin = ["ADMIN", "JEFE"].includes(user.rol || "");

  const tareas = rolAdmin
    ? await tareaService.getTodas(true)
    : await tareaService.getPorUsuario(user.id!);

  return NextResponse.json(tareas);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const data = await req.json();
    const tarea = await tareaService.crearTarea({
      descripcion: data.descripcion,
      prioridad: data.prioridad || "MEDIA",
      vencimiento: data.vencimiento ? new Date(data.vencimiento) : undefined,
      usuarioId: data.usuarioId,
      observaciones: data.observaciones,
    });
    return NextResponse.json(tarea);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
