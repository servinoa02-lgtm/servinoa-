import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

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
          orderBy: { createdAt: "desc" },
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
  const sesion = await requireAuth(["ADMIN", "TECNICO", "VENTAS"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    const body = await req.json();
    const orden = await prisma.ordenTrabajo.update({
      where: { id },
      data: {
        ...(body.estado && { estado: body.estado }),
        ...(body.tecnicoId !== undefined && { tecnicoId: body.tecnicoId || null }),
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        ...(body.revisionTecnica !== undefined && { revisionTecnica: body.revisionTecnica }),
        ...(body.fechaEntrega && { fechaEntrega: new Date(body.fechaEntrega) }),
        ...(body.fechaEstimadaEntrega && { fechaEstimadaEntrega: new Date(body.fechaEstimadaEntrega) }),
      },
      include: {
        cliente: { include: { empresa: true } },
        tecnico: true,
        creador: true,
        maquina: true,
        marca: true,
        modelo: true,
        presupuestos: { include: { items: true }, orderBy: { createdAt: "desc" } },
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth("ADMIN");
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    const presupuestosCount = await prisma.presupuesto.count({ where: { ordenId: id } });
    if (presupuestosCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: la OT tiene presupuestos asociados" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.nota.deleteMany({ where: { ordenId: id } });
      await tx.foto.deleteMany({ where: { ordenId: id } });
      await tx.ordenTrabajo.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar OT" }, { status: 500 });
  }
}