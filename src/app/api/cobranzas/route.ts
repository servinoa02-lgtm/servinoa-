import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cuentaCorrienteService } from "@/services/cuentaCorrienteService";
import { requireAuth } from "@/lib/requireAuth";
import { calcularTotalConIVA } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { descripcion: { contains: search, mode: "insensitive" } },
        { cliente: { nombre: { contains: search, mode: "insensitive" } } },
        { cliente: { empresa: { nombre: { contains: search, mode: "insensitive" } } } },
        { presupuesto: { facturaNumero: { contains: search, mode: "insensitive" } } },
      ];
    }

    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [cobranzas, totalCount, aggregate, monthlyAggregate] = await Promise.all([
      prisma.cobranza.findMany({
        where,
        include: {
          cliente: { include: { empresa: true } },
          presupuesto: {
            include: {
              cliente: { include: { empresa: true } },
              items: true,
              cobranzas: { select: { importe: true } },
              orden: { select: { numero: true } },
            },
          },
          caja: { select: { nombre: true } },
          usuario: { select: { nombre: true } },
        },
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.cobranza.count({ where }),
      prisma.cobranza.aggregate({
        where,
        _sum: { importe: true }
      }),
      prisma.cobranza.aggregate({
        where: {
          AND: [
            where,
            { fecha: { gte: inicioMes } }
          ]
        },
        _sum: { importe: true }
      })
    ]);

    const data = cobranzas.map((c) => {
      const ppto = c.presupuesto;
      if (!ppto) return { ...c, montoPresupuesto: null, saldo: null };

      const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
      const montoPresupuesto = calcularTotalConIVA(subtotal, ppto.incluyeIva);
      const cobradoTotal = ppto.cobranzas.reduce((sum, co) => sum + co.importe, 0);
      const saldo = montoPresupuesto - cobradoTotal;

      return { ...c, montoPresupuesto, saldo };
    });

    return NextResponse.json({
      data,
      total: totalCount,
      totalSum: aggregate._sum.importe || 0,
      totalMonth: monthlyAggregate._sum.importe || 0,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cobranzas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = await req.json();
    const {
      tipo,
      clienteId,
      presupuestoId,
      descripcion,
      importe,
      formaPago,
      cajaId,
      usuarioId,
      chequeNumero,
      chequeBanco,
      chequeFechaEmision,
      chequeFechaCobro,
    } = body;

    // ─── Validaciones básicas de entrada (sin consultar DB) ───
    const importeNum = parseFloat(importe);
    if (!Number.isFinite(importeNum) || importeNum <= 0) {
      return NextResponse.json(
        { error: "El importe debe ser un número mayor a 0" },
        { status: 400 }
      );
    }
    if (!cajaId) {
      return NextResponse.json({ error: "Debe seleccionar una caja" }, { status: 400 });
    }
    if (!usuarioId) {
      return NextResponse.json(
        { error: "Falta el usuario que registra el cobro" },
        { status: 400 }
      );
    }
    if (tipo === "PRESUPUESTO" && !presupuestoId) {
      return NextResponse.json(
        { error: "Para una cobranza de presupuesto debe indicar el presupuesto" },
        { status: 400 }
      );
    }

    // ─── Todo dentro de una sola transacción Serializable ───
    // La validación del saldo va DENTRO de la tx para evitar race conditions:
    // dos requests simultáneas no pueden ambas pasar la validación y ambas persistir.
    const cobranza = await prisma.$transaction(async (tx) => {
      let clienteIdFinal = clienteId || null;

      // Validar presupuesto dentro de la tx
      if (presupuestoId) {
        const ppto = await tx.presupuesto.findUnique({
          where: { id: presupuestoId },
          include: {
            items: true,
            cobranzas: { select: { importe: true } },
          },
        });

        if (!ppto) throw new Error("Presupuesto no encontrado");

        if (ppto.estado !== "APROBADO") {
          throw new Error(
            `No se puede cobrar: el presupuesto está en estado "${ppto.estado}". Solo se pueden cobrar presupuestos APROBADOS.`
          );
        }

        const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
        const total = calcularTotalConIVA(subtotal, ppto.incluyeIva);
        const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
        const saldoPendiente = total - cobrado;

        if (importeNum > saldoPendiente + 0.01) {
          throw new Error(
            `El importe ($${importeNum.toFixed(2)}) supera el saldo pendiente ($${saldoPendiente.toFixed(2)})`
          );
        }

        if (!clienteIdFinal && ppto.clienteId) {
          clienteIdFinal = ppto.clienteId;
        }
      }

      let chequeId: string | null = null;
      if (formaPago === "Cheques") {
        const nuevoCheque = await tx.cheque.create({
          data: {
            numeroCheque: chequeNumero || null,
            banco: chequeBanco || null,
            fechaEmision: chequeFechaEmision ? new Date(chequeFechaEmision) : null,
            fechaCobro: chequeFechaCobro ? new Date(chequeFechaCobro) : null,
            importe: importeNum,
            clienteId: clienteIdFinal,
            estado: "EN_CARTERA",
            descripcion:
              descripcion || (tipo === "PRESUPUESTO" ? "Cobro Presupuesto" : "Cobranza varia"),
          },
        });
        chequeId = nuevoCheque.id;
      }

      const nuevaCobranza = await tx.cobranza.create({
        data: {
          tipo: tipo || "PRESUPUESTO",
          clienteId: clienteIdFinal,
          presupuestoId: presupuestoId || null,
          descripcion: descripcion || null,
          importe: importeNum,
          formaPago: formaPago || "Efectivo",
          cajaId,
          usuarioId,
          chequeId,
          ...(body.fecha && { fecha: new Date(body.fecha) }),
        },
        include: {
          cliente: { include: { empresa: true } },
          presupuesto: { include: { items: true } },
          caja: { select: { nombre: true } },
          usuario: { select: { nombre: true } },
        },
      });

      // Movimiento de caja (ingreso)
      await tx.movimientoCaja.create({
        data: {
          cajaId,
          descripcion:
            descripcion ||
            `Cobranza ${tipo === "PRESUPUESTO" ? `Ppto #${nuevaCobranza.presupuesto?.numero}` : "varios"}`,
          ingreso: importeNum,
          egreso: 0,
          formaPago: formaPago || "Efectivo",
          cobranzaId: nuevaCobranza.id,
          chequeId,
        },
      });

      // Registrar HABER en CuentaCorriente
      if (clienteIdFinal) {
        await cuentaCorrienteService.registrarMovimiento(tx, {
          clienteId: clienteIdFinal,
          tipo: "HABER",
          origen: "COBRANZA",
          monto: importeNum,
          cobranzaId: nuevaCobranza.id,
          presupuestoId: presupuestoId || undefined,
        });
      }

      // Actualizar estadoCobro — el ppto ya incluye las cobranzas anteriores;
      // sumamos importeNum manualmente para no hacer otro fetch
      if (presupuestoId) {
        const ppto = await tx.presupuesto.findUnique({
          where: { id: presupuestoId },
          include: { items: true, cobranzas: { select: { importe: true } } },
        });
        if (ppto) {
          const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
          const total = calcularTotalConIVA(subtotal, ppto.incluyeIva);
          // cobranzas ya incluye la nueva (misma tx en Postgres)
          const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
          const estadoCobro =
            cobrado <= 0
              ? "COBRO_PENDIENTE"
              : cobrado >= total - 0.02
              ? "COBRADO"
              : "PARCIAL";
          await tx.presupuesto.update({
            where: { id: presupuestoId },
            data: { estadoCobro: estadoCobro as "COBRADO" | "COBRO_PENDIENTE" | "PARCIAL" },
          });
        }
      }

      return nuevaCobranza;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return NextResponse.json(cobranza);
  } catch (error: any) {
    console.error(error);
    // Serialization failures deben reintentarse desde el cliente
    if (error?.code === "P2034") {
      return NextResponse.json(
        { error: "Operación en conflicto con otra simultánea. Por favor intentá de nuevo." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || "Error al crear cobranza" }, { status: 500 });
  }
}
