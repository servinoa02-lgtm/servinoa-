import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET(req: NextRequest) {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { numeroCheque: { contains: search, mode: "insensitive" } },
        { librador: { contains: search, mode: "insensitive" } },
        { banco: { contains: search, mode: "insensitive" } },
        { cliente: { nombre: { contains: search, mode: "insensitive" } } },
        { cliente: { empresa: { nombre: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [cheques, totalCount, carteraAgg] = await Promise.all([
      prisma.cheque.findMany({
        where,
        include: { cliente: { include: { empresa: true } } },
        orderBy: { fechaIngreso: "desc" },
        skip,
        take: limit,
      }),
      prisma.cheque.count({ where }),
      prisma.cheque.aggregate({
        where: { estado: "EN_CARTERA" },
        _sum: { importe: true },
      }),
    ]);

    const hoy = new Date();
    const data = cheques.map((c) => {
      let diasVencimiento: number | null = null;
      let vencimientoTexto = "";
      if (c.fechaCobro) {
        const diff = Math.floor((c.fechaCobro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        diasVencimiento = diff;
        if (diff < 0) {
          vencimientoTexto = `VENCIDO hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`;
        } else if (diff === 0) {
          vencimientoTexto = "Vence HOY";
        } else {
          vencimientoTexto = `Vence en ${diff} día${diff !== 1 ? "s" : ""}`;
        }
      }
      return { ...c, diasVencimiento, vencimientoTexto };
    });

    return NextResponse.json({
      data,
      total: totalCount,
      totalCartera: carteraAgg._sum.importe || 0,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cheques" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "CAJA"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    const cheque = await prisma.cheque.create({
      data: {
        clienteId: body.clienteId || null,
        numeroCheque: body.numeroCheque || null,
        banco: body.banco || null,
        librador: body.librador || null,
        importe: parseFloat(body.importe),
        fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : null,
        fechaCobro: body.fechaCobro ? new Date(body.fechaCobro) : null,
        endosadoA: body.endosadoA || null,
        descripcion: body.descripcion || null,
        estado: body.estado || "EN_CARTERA",
      },
      include: {
        cliente: { include: { empresa: true } },
      },
    });
    return NextResponse.json(cheque);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cheque" }, { status: 500 });
  }
}
