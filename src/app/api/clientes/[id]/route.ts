import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        empresa: true,
        ordenes: {
          include: {
            maquina: true,
            marca: true,
            modelo: true,
            tecnico: { select: { nombre: true } },
          },
          orderBy: { numero: "desc" },
        },
        presupuestos: {
          include: {
            items: true,
            cobranzas: { select: { importe: true } },
            orden: { select: { numero: true } },
          },
          orderBy: { numero: "desc" },
        },
        cobranzas: {
          include: {
            caja: { select: { nombre: true } },
            presupuesto: { select: { numero: true } },
          },
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Calcular totales (aplica IVA si corresponde)
    const presupuestosConTotal = cliente.presupuestos.map((p) => {
      const subtotal = p.items.reduce((sum, item) => sum + item.total, 0);
      const total = p.incluyeIva ? subtotal * 1.21 : subtotal;
      const cobrado = p.cobranzas.reduce((sum, c) => sum + c.importe, 0);
      return { ...p, subtotal, total, cobrado, saldo: total - cobrado };
    });

    const totalPresupuestado = presupuestosConTotal
      .filter((p) => p.estado === "APROBADO")
      .reduce((sum, p) => sum + p.total, 0);
    const totalCobrado = cliente.cobranzas.reduce((sum, c) => sum + c.importe, 0);
    const saldoPendiente = totalPresupuestado - totalCobrado;

    return NextResponse.json({
      ...cliente,
      presupuestos: presupuestosConTotal,
      totalPresupuestado,
      totalCobrado,
      saldoPendiente,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    const body = await req.json();

    let empresaId = undefined;
    if (body.empresaNombre !== undefined) {
      if (body.empresaNombre) {
        const empresa = await prisma.empresa.upsert({
          where: { nombre: body.empresaNombre },
          update: {},
          create: { nombre: body.empresaNombre },
        });
        empresaId = empresa.id;
      } else {
        empresaId = null;
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.telefono !== undefined && { telefono: body.telefono || null }),
        ...(body.dni !== undefined && { dni: body.dni || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.domicilio !== undefined && { domicilio: body.domicilio || null }),
        ...(body.iva !== undefined && { iva: body.iva }),
        ...(empresaId !== undefined && { empresaId }),
      },
      include: { empresa: true },
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireAuth("ADMIN");
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;
  try {
    const ordenesCount = await prisma.ordenTrabajo.count({ where: { clienteId: id } });
    if (ordenesCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: el cliente tiene órdenes de trabajo asociadas" },
        { status: 400 }
      );
    }
    const presupuestosCount = await prisma.presupuesto.count({ where: { clienteId: id } });
    if (presupuestosCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: el cliente tiene presupuestos asociados" },
        { status: 400 }
      );
    }
    await prisma.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
