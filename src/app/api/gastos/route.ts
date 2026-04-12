import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { descripcion: { contains: search, mode: "insensitive" } },
        { proveedor: { nombre: { contains: search, mode: "insensitive" } } },
        { caja: { nombre: { contains: search, mode: "insensitive" } } },
        { empleado: { contains: search, mode: "insensitive" } },
        { tipo: { contains: search, mode: "insensitive" } },
      ];
    }

    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [gastos, totalCount, totals] = await Promise.all([
      prisma.gasto.findMany({
        where,
        include: {
          usuario: { select: { nombre: true } },
          caja: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
        },
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.gasto.count({ where }),
      prisma.gasto.aggregate({
        where: {
          AND: [
            where,
            { fecha: { gte: inicioMes } }
          ]
        },
        _sum: { importe: true }
      })
    ]);

    return NextResponse.json({
      data: gastos,
      total: totalCount,
      totalMonth: totals._sum.importe || 0,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar gastos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    const importeNum = parseFloat(body.importe);

    if (!Number.isFinite(importeNum) || importeNum <= 0) {
      return NextResponse.json({ error: "El importe debe ser mayor a 0" }, { status: 400 });
    }
    if (!body.cajaId) {
      return NextResponse.json({ error: "Debe seleccionar una caja" }, { status: 400 });
    }

    const gasto = await prisma.$transaction(async (tx) => {
      const nuevoGasto = await tx.gasto.create({
        data: {
          tipo: body.tipo || "GASTO_VARIOS",
          descripcion: body.descripcion || "",
          importe: importeNum,
          formaPago: body.formaPago || "EFECTIVO",
          cajaId: body.cajaId,
          usuarioId: body.usuarioId,
          proveedorId: body.proveedorId || null,
          comprobante: body.comprobante || null,
          empleado: body.empleado || null,
          desde: body.desde ? new Date(body.desde) : null,
          hasta: body.hasta ? new Date(body.hasta) : null,
        },
        include: {
          usuario: { select: { nombre: true } },
          caja: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
        },
      });

      // Registrar movimiento de caja (egreso)
      await tx.movimientoCaja.create({
        data: {
          cajaId: body.cajaId,
          descripcion: body.descripcion || "Gasto",
          ingreso: 0,
          egreso: importeNum,
          formaPago: body.formaPago || "EFECTIVO",
          gastoId: nuevoGasto.id,
        },
      });

      return nuevoGasto;
    });

    return NextResponse.json(gasto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar gasto" }, { status: 500 });
  }
}
