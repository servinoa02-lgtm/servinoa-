import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

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
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    const importeNum = parseFloat(body.importe);

    if (!Number.isFinite(importeNum) || importeNum <= 0) {
      return NextResponse.json({ error: "El importe debe ser mayor a 0" }, { status: 400 });
    }
    if (!body.cajaId) {
      return NextResponse.json({ error: "Debe seleccionar una caja" }, { status: 400 });
    }

    const gasto = await prisma.$transaction(async (tx) => {
      const nuevoGasto = await tx.gasto.create({
        data: {
          tipo: body.tipo || "GASTO_VARIOS",
          descripcion: body.descripcion || "",
          importe: importeNum,
          formaPago: body.formaPago || "EFECTIVO",
          cajaId: body.cajaId,
          usuarioId: body.usuarioId,
          proveedorId: body.proveedorId || null,
          comprobante: body.comprobante || null,
          empleado: body.empleado || null,
          desde: body.desde ? new Date(body.desde) : null,
          hasta: body.hasta ? new Date(body.hasta) : null,
        },
        include: {
          usuario: { select: { nombre: true } },
          caja: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
        },
      });

      // Registrar movimiento de caja (egreso)
      await tx.movimientoCaja.create({
        data: {
          cajaId: body.cajaId,
          descripcion: body.descripcion || "Gasto",
          ingreso: 0,
          egreso: importeNum,
          formaPago: body.formaPago || "EFECTIVO",
          gastoId: nuevoGasto.id,
        },
      });

      return nuevoGasto;
    });

    return NextResponse.json(gasto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar gasto" }, { status: 500 });
  }
}
