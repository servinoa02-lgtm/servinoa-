import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO"]);
  if (sesion instanceof NextResponse) return sesion;
  
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const rol = (sesion.user as any).rol;
  const esTecnico = rol === "TECNICO";

  const where: any = {};
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { empresa: { nombre: { contains: search, mode: "insensitive" } } },
      { dni: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { telefono: { contains: search, mode: "insensitive" } }
    ];
  }

  const [clientes, totalCount, globalAgg] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { 
        empresa: true,
        cuentaCorriente: esTecnico ? false : { select: { tipo: true, monto: true } }
      },
      orderBy: { nombre: "asc" },
      skip,
      take: limit,
    }),
    prisma.cliente.count({ where }),
    esTecnico ? Promise.resolve([]) : prisma.cuentaCorriente.groupBy({
      by: ["tipo"],
      where: { cliente: where },
      _sum: { monto: true }
    })
  ]);

  let globalSaldo = 0;
  if (!esTecnico) {
    const totalDebe = globalAgg.find(g => g.tipo === "DEBE")?._sum.monto || 0;
    const totalHaber = globalAgg.find(g => g.tipo === "HABER")?._sum.monto || 0;
    globalSaldo = totalDebe - totalHaber;
  }

  const result = clientes.map(c => {
    if (esTecnico) {
      return { id: c.id, nombre: c.nombre, empresa: c.empresa };
    }
    const debe = c.cuentaCorriente.filter(m => m.tipo === "DEBE").reduce((sum, m) => sum + m.monto, 0);
    const haber = c.cuentaCorriente.filter(m => m.tipo === "HABER").reduce((sum, m) => sum + m.monto, 0);
    return { ...c, saldo: debe - haber, cuentaCorriente: undefined };
  });

  return NextResponse.json({
    data: result,
    total: totalCount,
    globalSaldo,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit)
  });
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();

    let empresaId = null;
    if (body.empresaNombre) {
      const empresa = await prisma.empresa.upsert({
        where: { nombre: body.empresaNombre },
        update: {},
        create: { nombre: body.empresaNombre },
      });
      empresaId = empresa.id;
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: body.nombre,
        telefono: body.telefono || null,
        dni: body.dni || null,
        email: body.email || null,
        domicilio: body.domicilio || null,
        iva: body.iva || "NO incluyen IVA",
        empresaId,
      },
      include: { empresa: true },
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}