import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cuentaCorrienteService } from "@/services/cuentaCorrienteService";
import { requireAuth } from "@/lib/requireAuth";
import { calcularTotalConIVA } from "@/lib/constants";

export async function GET() {
  const sesion = await requireAuth();
  if (sesion instanceof NextResponse) return sesion;

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
      const ppto = c.presupuesto;
      if (!ppto) return { ...c, montoPresupuesto: null, saldo: null };

      const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
      const montoPresupuesto = calcularTotalConIVA(subtotal, ppto.incluyeIva);
      const cobradoTotal = ppto.cobranzas.reduce((sum, co) => sum + co.importe, 0);
      const saldo = montoPresupuesto - cobradoTotal;

      return { ...c, montoPresupuesto, saldo };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar cobranzas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sesion = await requireAuth(["ADMIN", "CAJA"]);
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

    // ─── Validaciones de entrada ───
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

    // ─── Validaciones críticas de presupuesto ───
    if (presupuestoId) {
      const ppto = await prisma.presupuesto.findUnique({
        where: { id: presupuestoId },
        include: {
          items: true,
          cobranzas: { select: { importe: true } },
        },
      });

      if (!ppto) {
        return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
      }

      // Solo se puede cobrar un presupuesto APROBADO
      if (ppto.estado !== "APROBADO") {
        return NextResponse.json(
          { error: `No se puede cobrar: el presupuesto está en estado "${ppto.estado}". Solo se pueden cobrar presupuestos APROBADOS.` },
          { status: 400 }
        );
      }

      // No permitir cobrar más que el saldo pendiente
      const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
      const total = calcularTotalConIVA(subtotal, ppto.incluyeIva);
      const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
      const saldoPendiente = total - cobrado;

      if (importeNum > saldoPendiente + 0.01) {
        return NextResponse.json(
          { error: `El importe ($${importeNum.toFixed(2)}) supera el saldo pendiente ($${saldoPendiente.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    // ─── Todo dentro de una sola transacción ───
    const cobranza = await prisma.$transaction(async (tx) => {
      let chequeId: string | null = null;
      if (formaPago === "Cheque") {
        const nuevoCheque = await tx.cheque.create({
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

      const nuevaCobranza = await tx.cobranza.create({
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

      // Registrar HABER en CuentaCorriente (mismo tx)
      if (clienteId) {
        await cuentaCorrienteService.registrarMovimiento(tx, {
          clienteId,
          tipo: "HABER",
          origen: "COBRANZA",
          monto: importeNum,
          cobranzaId: nuevaCobranza.id,
          presupuestoId: presupuestoId || undefined,
        });
      }

      // Actualizar estadoCobro del presupuesto
      if (presupuestoId) {
        const ppto = await tx.presupuesto.findUnique({
          where: { id: presupuestoId },
          include: {
            items: true,
            cobranzas: { select: { importe: true } },
          },
        });
        if (ppto) {
          const subtotal = ppto.items.reduce((sum, item) => sum + item.total, 0);
          const total = calcularTotalConIVA(subtotal, ppto.incluyeIva);
          const cobrado = ppto.cobranzas.reduce((sum, c) => sum + c.importe, 0);
          const estadoCobro =
            cobrado <= 0
              ? "COBRO_PENDIENTE"
              : cobrado >= total
              ? "COBRADO"
              : "PARCIAL";
          await tx.presupuesto.update({
            where: { id: presupuestoId },
            data: { estadoCobro: estadoCobro as "COBRADO" | "COBRO_PENDIENTE" | "PARCIAL" },
          });
        }
      }

      return nuevaCobranza;
    });

    return NextResponse.json(cobranza);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cobranza" }, { status: 500 });
  }
}
