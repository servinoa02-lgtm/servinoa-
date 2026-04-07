import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
        iva: body.iva || null,
      },
    });
    return NextResponse.json(proveedor);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear proveedor" }, { status: 500 });
  }
}
