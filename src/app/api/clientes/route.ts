import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    include: { empresa: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let empresaId = null;
  if (body.empresa && body.empresa !== "Particular") {
    const empresa = await prisma.empresa.upsert({
      where: { nombre: body.empresa },
      update: {},
      create: { nombre: body.empresa },
    });
    empresaId = empresa.id;
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre: body.nombre,
      dni: body.dni || null,
      email: body.email || null,
      domicilio: body.domicilio || null,
      telefono: body.telefono || null,
      iva: body.iva || "NO incluyen IVA",
      empresaId,
    },
    include: { empresa: true },
  });

  return NextResponse.json(cliente);
}