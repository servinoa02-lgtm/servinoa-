import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gastos = await prisma.gasto.findMany({
      include: {
        usuario: { select: { nombre: true } },
        caja: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(gastos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar gastos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipo, descripcion, importe, formaPago, cajaId, usuarioId, proveedorId, comprobante, firma, empleado, desde, hasta } = body;

    const gasto = await prisma.gasto.create({
      data: {
        tipo: tipo || "GASTO_VARIOS",
        descripcion,
        importe: parseFloat(importe),
        formaPago: formaPago || "Efectivo",
        cajaId,
        usuarioId,
        proveedorId: proveedorId || null,
        comprobante: comprobante || null,
        firma: firma || null,
        empleado: empleado || null,
        desde: desde ? new Date(desde) : null,
        hasta: hasta ? new Date(hasta) : null,
      },
      include: {
        usuario: { select: { nombre: true } },
        caja: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
      },
    });

    // Crear movimiento de caja
    await prisma.movimientoCaja.create({
      data: {
        cajaId,
        descripcion: tipo === "SUELDO" ? `Sueldo ${empleado || ""}` : descripcion,
        ingreso: 0,
        egreso: parseFloat(importe),
        formaPago: formaPago || "Efectivo",
        gastoId: gasto.id,
      },
    });

    return NextResponse.json(gasto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear gasto" }, { status: 500 });
  }
}
