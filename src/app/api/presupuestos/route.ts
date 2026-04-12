import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { calcularTotalConIVA } from "@/lib/constants";


export async function GET(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { cliente: { nombre: { contains: search, mode: "insensitive" } } },
        { cliente: { empresa: { nombre: { contains: search, mode: "insensitive" } } } },
        { usuario: { nombre: { contains: search, mode: "insensitive" } } },
        { observaciones: { contains: search, mode: "insensitive" } },
        { facturaNumero: { contains: search, mode: "insensitive" } },
        ...(isNaN(parseInt(search)) ? [] : [{ numero: parseInt(search) }]),
        ...(isNaN(parseInt(search)) ? [] : [{ orden: { numero: parseInt(search) } }])
      ];
    }

    const [presupuestos, totalCount, allFiltered] = await Promise.all([
      prisma.presupuesto.findMany({
        where,
        include: {
          cliente: { include: { empresa: true } },
          orden: { select: { numero: true, id: true } },
          usuario: { select: { nombre: true } },
          items: true,
          cobranzas: { select: { importe: true } },
        },
        orderBy: { numero: "desc" },
        skip,
        take: limit,
      }),
      prisma.presupuesto.count({ where }),
      prisma.presupuesto.findMany({
        where,
        select: {
          incluyeIva: true,
          items: { select: { total: true } },
          cobranzas: { select: { importe: true } }
        }
      })
    ]);

    // Resumen global del filtro
    let globalTotal = 0;
    let globalCobrado = 0;
    allFiltered.forEach(p => {
      const subtotal = p.items.reduce((sum, item) => sum + item.total, 0);
      const total = calcularTotalConIVA(subtotal, p.incluyeIva);
      const cobrado = p.cobranzas.reduce((sum, c) => sum + c.importe, 0);
      globalTotal += total;
      globalCobrado += cobrado;
    });

    const data = presupuestos.map((p) => {
      const subtotal = p.items.reduce((sum, item) => sum + item.total, 0);
      const total = calcularTotalConIVA(subtotal, p.incluyeIva);
      const cobrado = p.cobranzas.reduce((sum, c) => sum + c.importe, 0);
      return { ...p, total, subtotal, cobrado, saldo: total - cobrado };
    });

    return NextResponse.json({
      data,
      total: totalCount,
      globalTotal,
      globalCobrado,
      globalSaldo: globalTotal - globalCobrado,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    const { clienteId, ordenId, usuarioId, items, observaciones, incluyeIva, formaPago, validezDias, moneda } = body;

    // ─── Validaciones ───
    if (!clienteId) {
      return NextResponse.json({ error: "Debe seleccionar un cliente" }, { status: 400 });
    }
    if (!usuarioId) {
      return NextResponse.json({ error: "Falta el usuario que crea el presupuesto" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "El presupuesto debe tener al menos un ítem" },
        { status: 400 }
      );
    }
    for (const [i, item] of items.entries()) {
      const cantidad = Number(item?.cantidad);
      const precio = Number(item?.precio);
      if (!item?.descripcion || !String(item.descripcion).trim()) {
        return NextResponse.json(
          { error: `El ítem #${i + 1} no tiene descripción` },
          { status: 400 }
        );
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return NextResponse.json(
          { error: `El ítem #${i + 1} tiene una cantidad inválida` },
          { status: 400 }
        );
      }
      if (!Number.isFinite(precio) || precio < 0) {
        return NextResponse.json(
          { error: `El ítem #${i + 1} tiene un precio inválido` },
          { status: 400 }
        );
      }
    }

    // ─── Crear presupuesto + actualizar OT en la misma transacción ───
    const presupuesto = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.presupuesto.create({
        data: {
          clienteId,
          ordenId: ordenId || null,
          usuarioId,
          observaciones: observaciones || null,
          incluyeIva: incluyeIva ?? true,
          formaPago: formaPago || "Contado",
          validezDias: validezDias || 7,
          moneda: moneda || "ARS",
          estado: "PRESUPUESTADO",
          estadoCobro: "APROBACION_PENDIENTE",
          items: {
            create: items.map((item: { cantidad: number; descripcion: string; precio: number }) => ({
              cantidad: Number(item.cantidad),
              descripcion: item.descripcion,
              precio: Number(item.precio),
              total: Number(item.cantidad) * Number(item.precio),
            })),
          },
        },
        include: {
          cliente: { include: { empresa: true } },
          orden: { select: { numero: true, id: true } },
          usuario: { select: { nombre: true } },
          items: true,
        },
      });

      // Si tiene OT, cambiar estado OT a PRESUPUESTADO
      if (ordenId) {
        await tx.ordenTrabajo.update({
          where: { id: ordenId },
          data: { estado: "PRESUPUESTADO" },
        });
      }

      return nuevo;
    });

    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
  }
}
