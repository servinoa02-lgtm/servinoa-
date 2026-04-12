import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const tecnicos = await prisma.usuario.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(tecnicos);
}