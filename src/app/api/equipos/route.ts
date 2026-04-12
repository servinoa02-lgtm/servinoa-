import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const [maquinas, marcas, modelos] = await Promise.all([
    prisma.maquina.findMany({ orderBy: { nombre: "asc" } }),
    prisma.marca.findMany({ orderBy: { nombre: "asc" } }),
    prisma.modelo.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  return NextResponse.json({ maquinas, marcas, modelos });
}