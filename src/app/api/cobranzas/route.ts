import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cuentaCorrienteService } from "@/services/cuentaCorrienteService";

export async function GET() {
  try {
    const cobranzas = await prisma.cobranza.findMany({
      include: {
        cliente: { include: { empresa: true } },
        presupuesto: {
          include: {
            items: true,
            cobranzas: { select: { importe: true } },
            orden: { select: { numero: true } },
          },
        },
        caja: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });

    const data = cobranzas.map((c) => {
      const subtotal = c.presupuesto
        ? c.presupuesto.items.reduce((sum, item) => sum + item.total, 0)
        : null;
      const montoPresupuesto =
        subtotal !== null && (c.presupuesto as any)?.incluyeIva
          ? subtotal * 1.21
          : subtotal;
      const cobradoTotal = c.presupuesto
        ? c.presupuesto.cobranzas.reduce((sum, co) => sum + co.importe, 0)
        : null;
      const saldo =
        montoPresupuesto !== null && cobradoTotal !== null
          ? montoPresupuesto - cobradoTotal
          : null;
      return { ...c, montoPresupuesto, saldo };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cobranzas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const importeNum = parseFloat(importe);

    let chequeId: string | null = null;
    if (formaPago === "Cheque") {
      const nuevoCheque = await prisma.cheque.create({
        data: {
          numeroCheque: chequeNumero || null,
          banco: chequeBanco || null,
          fechaEmision: chequeFechaEmision ? new Date(chequeFechaEmision) : null,
          fechaCobro: chequeFechaCobro ? new Date(chequeFechaCobro) : null,
          importe: importeNum,
          clienteId: clienteId || null,
          estado: "EN_CARTERA",
          descripcion:
            descripcion || (tipo === "PRESUPUESTO" ? "Cobro Presupuesto" : "Cobranza varia"),
        },
      });
      chequeId = nuevoCheque.id;
    }

    const cobranza = await prisma.cobranza.create({
      data: {
        tipo: tipo || "PRESUPUESTO",
        clienteId: clienteId || null,
        presupuestoId: presupuestoId || null,
        descripcion: descripcion || null,
        importe: importeNum,
        formaPago: formaPago || "Efectivo",
        cajaId,
        usuarioId,
        chequeId,
      },
      include: {
        cliente: { include: { empresa: true } },
        presupuesto: { include: { items: true } },
        caja: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    });

    // Movimiento de caja (ingreso)
    await prisma.movimientoCaja.create({
      data: {
        cajaId,
        descripcion:
          descripcion ||
          `Cobranza ${tipo === "PRESUPUESTO" ? `Ppto #${cobranza.presupuesto?.numero}` : "varios"}`,
        ingreso: importeNum,
        egreso: 0,
        formaPago: formaPago || "Efectivo",
        cobranzaId: cobranza.id,
        chequeId,
      },
    });

    // ─── FIX SALDO: registrar HABER en CuentaCorriente ───
    if (clienteId) {
      await cuentaCorrienteService.registrarMovimiento(null, {
        clienteId,
        tipo: "HABER",
        origen: "COBRANZA",
        monto: importeNum,
        cobranzaId: cobranza.id,
        presupuestoId: presupuestoId || undefined,
      });
    }

    // Actualizar estadoCobro del presupuesto
    if (presupuestoId) {
      const ppto = await prisma.presupuesto.findUnique({
        where: { id: presupuestoId },
        include: {
          items: true,
          cobranzas: { select: { importe: true } },
        },
      });
      if (ppto) {
        const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
        const total = ppto.incluyeIva ? subtotal * 1.21 : subtotal;
        const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
        const estadoCobro =
          cobrado <= 0
            ? "COBRO_PENDIENTE"
            : cobrado >= total
            ? "COBRADO"
            : "PARCIAL";
        await prisma.presupuesto.update({
          where: { id: presupuestoId },
          data: { estadoCobro: estadoCobro as "COBRADO" | "COBRO_PENDIENTE" | "PARCIAL" },
        });
      }
    }

    return NextResponse.json(cobranza);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cobranza" }, { status: 500 });
  }
}
