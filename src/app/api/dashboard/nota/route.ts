import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: Request) {
  const session = await requireAuth(["ADMIN", "JEFE"]);
  if (session instanceof NextResponse) return session;

  try {
    const { nota } = await req.json();

    const config = await prisma.configuracion.upsert({
      where: { clave: "NOTA_GLOBAL" },
      update: { valor: nota },
      create: { clave: "NOTA_GLOBAL", valor: nota },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error al guardar la nota global:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
