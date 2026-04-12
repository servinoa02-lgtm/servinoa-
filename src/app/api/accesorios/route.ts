import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const accesorios = await prisma.accesorioCatalogo.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(accesorios);
}

export async function POST(req: Request) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { nombre } = await req.json();
    const newAcc = await prisma.accesorioCatalogo.create({ data: { nombre } });
    return NextResponse.json(newAcc);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: "Ya existe." }, { status: 400 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
