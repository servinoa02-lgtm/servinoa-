import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const ordenes = await prisma.ordenTrabajo.findMany({
      include: {
        cliente: { include: { empresa: true } },
        tecnico: true,
        maquina: true,
        marca: true,
        modelo: true,
      },
      orderBy: { numero: "desc" },
    });
    return NextResponse.json(ordenes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar ordenes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let maquinaId = body.maquinaId || null;
    if (!maquinaId && body.maquinaNueva) {
      const m = await prisma.maquina.create({ data: { nombre: body.maquinaNueva } });
      maquinaId = m.id;
    }
    let marcaId = body.marcaId || null;
    if (!marcaId && body.marcaNueva) {
      const m = await prisma.marca.create({ data: { nombre: body.marcaNueva, maquinaId } });
      marcaId = m.id;
    }
    let modeloId = body.modeloId || null;
    if (!modeloId && body.modeloNuevo) {
      const m = await prisma.modelo.create({ data: { nombre: body.modeloNuevo, marcaId } });
      modeloId = m.id;
    }
    const orden = await prisma.ordenTrabajo.create({
      data: {
        clienteId: body.clienteId,
        creadorId: body.creadorId,
        tecnicoId: body.tecnicoId || null,
        maquinaId,
        marcaId,
        modeloId,
        falla: body.falla || "",
        accesorios: body.accesorios || "No incluye Ningun Accesorio",
        nroSerie: body.nroSerie || "",
        observaciones: body.observaciones || "",
        fechaEstimadaEntrega: body.fechaEstimadaEntrega ? new Date(body.fechaEstimadaEntrega) : null,
        estado: "PARA_REVISAR",
      },
      include: {
        cliente: { include: { empresa: true } },
        tecnico: true,
        maquina: true,
        marca: true,
        modelo: true,
      },
    });
    return NextResponse.json(orden);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear OT" }, { status: 500 });
  }
}