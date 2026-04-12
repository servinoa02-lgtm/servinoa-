import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { obtenerSaldosCajas } from "@/lib/financeUtils";

export async function GET(req: Request) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const cutoffDate = dateStr ? new Date(dateStr) : undefined;

    const cajasConSaldo = await obtenerSaldosCajas(cutoffDate);
    return NextResponse.json(cajasConSaldo);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cajas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sesion = await requireAuth(["ADMIN", "JEFE"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    if (!body.nombre) return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });

    const caja = await prisma.caja.create({
      data: { nombre: body.nombre.trim().toUpperCase() }
    });

    return NextResponse.json(caja);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear caja" }, { status: 500 });
  }
}
