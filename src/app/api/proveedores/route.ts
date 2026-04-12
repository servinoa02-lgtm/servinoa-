import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: body.nombre,
        empresa: body.empresa || null,
        cuit: body.cuit || null,
        email: body.email || null,
        domicilio: body.domicilio || null,
        telefono: body.telefono || null,
        rubro: body.rubro || null,
        iva: body.iva || null,
      },
    });
    return NextResponse.json(proveedor);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear proveedor" }, { status: 500 });
  }
}
