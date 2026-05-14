import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ordenes = await prisma.ordenServicio.findMany({
    include: {
      cliente: { include: { empresa: true } },
      tecnico: true,
      presupuestos: { select: { id: true, numero: true, estado: true } },
    },
    orderBy: { numero: "desc" },
  });
  return NextResponse.json(ordenes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const orden = await prisma.ordenServicio.create({
    data: {
      clienteId: body.clienteId,
      creadorId: body.creadorId,
      tecnicoId: body.tecnicoId || null,
      descripcion: body.descripcion || null,
      ubicacion: body.ubicacion || null,
      observaciones: body.observaciones || null,
      fechaProgramada: body.fechaProgramada ? new Date(body.fechaProgramada) : null,
      horasCampo: parseFloat(body.horasCampo) || 0,
      kilometros: parseFloat(body.kilometros) || 0,
      imprevistos: parseFloat(body.imprevistos) || 0,
      valorHora: parseFloat(body.valorHora) || 55,
      valorKm: parseFloat(body.valorKm) || 1.7,
      iva: parseFloat(body.iva) || 0.21,
      tipoCambio: parseFloat(body.tipoCambio) || 1420,
      estado: "PENDIENTE",
    },
    include: {
      cliente: { include: { empresa: true } },
      tecnico: true,
    },
  });

  await prisma.historialOS.create({
    data: {
      ordenId: orden.id,
      estadoNuevo: "PENDIENTE",
      comentario: "OS creada",
    },
  });

  return NextResponse.json(orden);
}
