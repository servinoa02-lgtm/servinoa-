import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET() {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

  const clientes = await prisma.cliente.findMany({
    include: { 
      empresa: true,
      cuentaCorriente: { select: { tipo: true, monto: true } }
    },
    orderBy: { nombre: "asc" },
  });
  const clientesConSaldo = clientes.map(c => {
    const debe = c.cuentaCorriente.filter(m => m.tipo === "DEBE").reduce((sum, m) => sum + m.monto, 0);
    const haber = c.cuentaCorriente.filter(m => m.tipo === "HABER").reduce((sum, m) => sum + m.monto, 0);
    return { ...c, saldo: debe - haber, cuentaCorriente: undefined };
  });

  return NextResponse.json(clientesConSaldo);
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth();
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