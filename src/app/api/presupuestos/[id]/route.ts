import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { presupuestoService } from "@/services/presupuestoService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        cliente: { include: { empresa: true } },
        orden: {
          select: {
            numero: true,
            id: true,
            maquina: true,
            marca: true,
            modelo: true,
            nroSerie: true,
            falla: true,
          },
        },
        usuario: { select: { nombre: true } },
        items: true,
        cobranzas: {
          include: { caja: { select: { nombre: true } } },
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!presupuesto) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    }

    const subtotal = presupuesto.items.reduce((sum, item) => sum + item.total, 0);
    const total = presupuesto.incluyeIva ? subtotal * 1.21 : subtotal;
    const cobrado = presupuesto.cobranzas.reduce((sum, c) => sum + c.importe, 0);

    return NextResponse.json({ ...presupuesto, total, subtotal, cobrado, saldo: total - cobrado });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    // Si se está aprobando, usar el servicio que maneja CuentaCorriente
    if (body.estado === "APROBADO") {
      const aprobado = await presupuestoService.aprobarPresupuesto(id);
      if (!aprobado) {
        return NextResponse.json({ error: "Presupuesto no encontrado o ya aprobado" }, { status: 400 });
      }
      // Cambiar OT a APROBADO también
      const ppto = await prisma.presupuesto.findUnique({ where: { id }, select: { ordenId: true } });
      if (ppto?.ordenId) {
        await prisma.ordenTrabajo.update({ where: { id: ppto.ordenId }, data: { estado: "APROBADO" } });
      }
    } else {
      // Para otros cambios (RECHAZADO, cambio de facturaNumero, etc.)
      await prisma.presupuesto.update({
        where: { id },
        data: {
          ...(body.estado && { estado: body.estado }),
          ...(body.estadoCobro && { estadoCobro: body.estadoCobro }),
          ...(body.facturaNumero !== undefined && { facturaNumero: body.facturaNumero }),
          ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        },
      });

      // Si rechazado, cambiar OT también
      if (body.estado === "RECHAZADO") {
        const ppto = await prisma.presupuesto.findUnique({ where: { id }, select: { ordenId: true } });
        if (ppto?.ordenId) {
          await prisma.ordenTrabajo.update({ where: { id: ppto.ordenId }, data: { estado: "RECHAZADO" } });
        }
      }
    }

    // Devolver presupuesto completo con totales calculados
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      include: {
        cliente: { include: { empresa: true } },
        orden: { select: { numero: true, id: true } },
        usuario: { select: { nombre: true } },
        items: true,
        cobranzas: { include: { caja: { select: { nombre: true } } }, orderBy: { fecha: "desc" } },
      },
    });

    if (!presupuesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const subtotal = presupuesto.items.reduce((sum, item) => sum + item.total, 0);
    const total = presupuesto.incluyeIva ? subtotal * 1.21 : subtotal;
    const cobrado = presupuesto.cobranzas.reduce((sum, c) => sum + c.importe, 0);

    return NextResponse.json({ ...presupuesto, total, subtotal, cobrado, saldo: total - cobrado });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  try {
    const cobranzasCount = await prisma.cobranza.count({ where: { presupuestoId: id } });
    if (cobranzasCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: el presupuesto tiene cobranzas registradas" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.cuentaCorriente.deleteMany({ where: { presupuestoId: id } });
      await tx.itemPresupuesto.deleteMany({ where: { presupuestoId: id } });
      await tx.presupuesto.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
  }
}
