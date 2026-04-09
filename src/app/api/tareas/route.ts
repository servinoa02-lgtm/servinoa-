import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tareaService } from "@/services/tareaService";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tareas = await tareaService.getTodas(true);
  return NextResponse.json(tareas);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
