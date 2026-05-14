import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tecnicos = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, rol: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(tecnicos);
}