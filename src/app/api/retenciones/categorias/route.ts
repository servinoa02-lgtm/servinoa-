import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

const CLAVE = "CATEGORIAS_RETENCIONES";
const DEFAULT_CATEGORIAS = ["IVA", "GANANCIAS", "INGRESOS BRUTOS"];

export async function GET() {
  const session = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (session instanceof NextResponse) return session;

  const config = await prisma.configuracion.findUnique({ where: { clave: CLAVE } });
  const categorias: string[] = config ? JSON.parse(config.valor) : DEFAULT_CATEGORIAS;
  return NextResponse.json(categorias);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["ADMIN", "JEFE"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { categorias } = body as { categorias: string[] };

  if (!Array.isArray(categorias) || categorias.some((c) => typeof c !== "string" || !c.trim())) {
    return NextResponse.json({ error: "Lista de categorías inválida" }, { status: 400 });
  }

  const limpias = categorias.map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (limpias.length === 0) {
    return NextResponse.json({ error: "Debe haber al menos una categoría" }, { status: 400 });
  }

  await prisma.configuracion.upsert({
    where: { clave: CLAVE },
    update: { valor: JSON.stringify(limpias) },
    create: { clave: CLAVE, valor: JSON.stringify(limpias) },
  });

  return NextResponse.json(limpias);
}
