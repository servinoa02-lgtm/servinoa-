import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  // Permitimos explícitamente a todos los roles operativos ver la lista de OTs
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO", "VENTAS", "CAJA"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { cliente: { nombre: { contains: search, mode: "insensitive" } } },
        { cliente: { empresa: { nombre: { contains: search, mode: "insensitive" } } } },
        { maquina: { nombre: { contains: search, mode: "insensitive" } } },
        { falla: { contains: search, mode: "insensitive" } },
        // Si el search es un número, buscar por número de orden
        ...(isNaN(parseInt(search)) ? [] : [{ numero: parseInt(search) }])
      ];
    }

    const [ordenes, total] = await Promise.all([
      prisma.ordenTrabajo.findMany({
        where,
        include: {
          cliente: { include: { empresa: true } },
          tecnico: true,
          maquina: true,
          marca: true,
          modelo: true,
        },
        orderBy: { numero: "desc" },
        skip,
        take: limit,
      }),
      prisma.ordenTrabajo.count({ where })
    ]);

    return NextResponse.json({
      data: ordenes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar ordenes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "TECNICO", "VENTAS"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();

    // ─── Validaciones ───
    if (!body.clienteId) {
      return NextResponse.json({ error: "Debe seleccionar un cliente" }, { status: 400 });
    }
    if (!body.creadorId) {
      return NextResponse.json({ error: "Falta el usuario que crea la OT" }, { status: 400 });
    }

    // ─── Toda la creación en una sola transacción atómica ───
    const orden = await prisma.$transaction(async (tx) => {
      let maquinaId = body.maquinaId || null;
      if (!maquinaId && body.maquinaNueva) {
        const m = await tx.maquina.create({ data: { nombre: body.maquinaNueva } });
        maquinaId = m.id;
      }
      let marcaId = body.marcaId || null;
      if (!marcaId && body.marcaNueva) {
        const m = await tx.marca.create({ data: { nombre: body.marcaNueva, maquinaId } });
        marcaId = m.id;
      }
      let modeloId = body.modeloId || null;
      if (!modeloId && body.modeloNuevo) {
        const m = await tx.modelo.create({ data: { nombre: body.modeloNuevo, marcaId } });
        modeloId = m.id;
      }

      return tx.ordenTrabajo.create({
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
    });

    return NextResponse.json(orden);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear OT" }, { status: 500 });
  }
}