import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    include: {
      cliente: { include: { empresa: true } },
      tecnico: true,
      maquina: true,
      marca: true,
      modelo: true,
      presupuestos: true,
    },
    orderBy: { numero: "desc" },
  });
  return NextResponse.json(ordenes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let maquinaId = null;
  if (body.maquina) {
    const maquina = await prisma.maquina.upsert({
      where: { nombre: body.maquina },
      update: {},
      create: { nombre: body.maquina },
    });
    maquinaId = maquina.id;
  }

  let marcaId = null;
  if (body.marca && maquinaId) {
    const marca = await prisma.marca.upsert({
      where: { nombre_maquinaId: { nombre: body.marca, maquinaId } },
      update: {},
      create: { nombre: body.marca, maquinaId },
    });
    marcaId = marca.id;
  }

  let modeloId = null;
  if (body.modelo && marcaId) {
    const modelo = await prisma.modelo.upsert({
      where: { nombre_marcaId: { nombre: body.modelo, marcaId } },
      update: {},
      create: { nombre: body.modelo, marcaId },
    });
    modeloId = modelo.id;
  }

  const orden = await prisma.ordenTrabajo.create({
    data: {
      clienteId: body.clienteId,
      creadorId: body.creadorId,
      tecnicoId: body.tecnicoId || null,
      maquinaId,
      marcaId,
      modeloId,
      falla: body.falla || null,
      observaciones: body.observaciones || null,
      nroSerie: body.nroSerie || null,
      accesorios: body.accesorios || null,
      estado: "RECIBIDO",
    },
    include: {
      cliente: { include: { empresa: true } },
      tecnico: true,
      maquina: true,
      marca: true,
      modelo: true,
    },
  });

  await prisma.historialOT.create({
    data: {
      ordenId: orden.id,
      estadoNuevo: "RECIBIDO",
      comentario: "OT creada",
    },
  });

  return NextResponse.json(orden);
}