import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        cliente: { include: { empresa: true } },
        tecnico: true,
        creador: true,
        maquina: true,
        marca: true,
        modelo: true,
        presupuestos: {
          include: { items: true },
          orderBy: { fecha: "desc" },
        },
        notas: {
          include: { usuario: true },
          orderBy: { fecha: "desc" },
        },
        fotos: { orderBy: { fecha: "desc" } },
      },
    });
    if (!orden) {
      return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
    }
    return NextResponse.json(orden);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const orden = await prisma.ordenTrabajo.update({
      where: { id },
      data: {
        ...(body.estado && { estado: body.estado }),
        ...(body.tecnicoId !== undefined && { tecnicoId: body.tecnicoId || null }),
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        ...(body.fechaEntrega && { fechaEntrega: new Date(body.fechaEntrega) }),
      },
      include: {
        cliente: { include: { empresa: true } },
        tecnico: true,
        creador: true,
        maquina: true,
        marca: true,
        modelo: true,
        presupuestos: { include: { items: true }, orderBy: { createdAt: "desc" as const } },
        notas: { include: { usuario: true }, orderBy: { fecha: "desc" } },
        fotos: true,
      },
    });
    return NextResponse.json(orden);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}