import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET() {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO"]);
  if (sesion instanceof NextResponse) return sesion;
  
  const rol = (sesion.user as any).rol;
  const esTecnico = rol === "TECNICO";

  const clientes = await prisma.cliente.findMany({
    include: { 
      empresa: true,
      cuentaCorriente: { select: { tipo: true, monto: true } }
    },
    orderBy: { nombre: "asc" },
  });
  const result = clientes.map(c => {
    if (esTecnico) {
      return { id: c.id, nombre: c.nombre, empresa: c.empresa };
    }
    const debe = c.cuentaCorriente.filter(m => m.tipo === "DEBE").reduce((sum, m) => sum + m.monto, 0);
    const haber = c.cuentaCorriente.filter(m => m.tipo === "HABER").reduce((sum, m) => sum + m.monto, 0);
    return { ...c, saldo: debe - haber, cuentaCorriente: undefined };
  });

  return NextResponse.json(result);
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