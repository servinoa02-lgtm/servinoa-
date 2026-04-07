import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [maquinas, marcas, modelos] = await Promise.all([
    prisma.maquina.findMany({ orderBy: { nombre: "asc" } }),
    prisma.marca.findMany({ orderBy: { nombre: "asc" } }),
    prisma.modelo.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  return NextResponse.json({ maquinas, marcas, modelos });
}