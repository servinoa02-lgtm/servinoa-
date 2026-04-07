import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const accesorios = await prisma.accesorioCatalogo.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(accesorios);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { nombre } = await req.json();
    const newAcc = await prisma.accesorioCatalogo.create({ data: { nombre } });
    return NextResponse.json(newAcc);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: "Ya existe." }, { status: 400 });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
