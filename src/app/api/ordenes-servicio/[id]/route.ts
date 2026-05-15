import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  const orden = await prisma.ordenServicio.findUnique({
    where: { id },
    include: {
      cliente: { include: { empresa: true } },
      tecnico: true,
      creador: true,
      presupuestos: {
        include: { items: true },
        orderBy: { numero: "desc" },
      },
      historial: { orderBy: { fecha: "desc" } },
    },
  });
  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(orden);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  const body = await req.json();

  const ordenActual = await prisma.ordenServicio.findUnique({ where: { id } });
  if (!ordenActual) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.estado !== undefined) data.estado = body.estado;
  if (body.descripcion !== undefined) data.descripcion = body.descripcion;
  if (body.ubicacion !== undefined) data.ubicacion = body.ubicacion;
  if (body.observaciones !== undefined) data.observaciones = body.observaciones;
  if (body.tecnicoId !== undefined) data.tecnicoId = body.tecnicoId || null;
  if (body.fechaProgramada !== undefined) data.fechaProgramada = body.fechaProgramada ? new Date(body.fechaProgramada) : null;
  if (body.horasCampo !== undefined) data.horasCampo = parseFloat(body.horasCampo);
  if (body.kilometros !== undefined) data.kilometros = parseFloat(body.kilometros);
  if (body.imprevistos !== undefined) data.imprevistos = parseFloat(body.imprevistos);
  if (body.valorHora !== undefined) data.valorHora = parseFloat(body.valorHora);
  if (body.valorKm !== undefined) data.valorKm = parseFloat(body.valorKm);
  if (body.iva !== undefined) data.iva = parseFloat(body.iva);
  if (body.tipoCambio !== undefined) data.tipoCambio = parseFloat(body.tipoCambio);

  const orden = await prisma.ordenServicio.update({ where: { id }, data });

  if (body.estado && body.estado !== ordenActual.estado) {
    await prisma.historialOS.create({
      data: {
        ordenId: id,
        estadoAnterior: ordenActual.estado,
        estadoNuevo: body.estado,
        comentario: body.comentario || null,
      },
    });
  }

  return NextResponse.json(orden);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth(["ADMIN", "JEFE"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  await prisma.historialOS.deleteMany({ where: { ordenId: id } });
  await prisma.ordenServicio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
