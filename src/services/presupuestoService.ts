import { prisma } from "@/lib/prisma";
import { cuentaCorrienteService } from "./cuentaCorrienteService";

export const presupuestoService = {
  /**
   * Calcula el total de un presupuesto aplicando IVA si corresponde.
   * items.total = cantidad * precio (siempre sin IVA).
   * El IVA se aplica sobre el subtotal a nivel de presupuesto.
   */
  calcularTotal(items: { total: number }[], incluyeIva: boolean): { subtotal: number; total: number } {
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const total = incluyeIva ? subtotal * 1.21 : subtotal;
    return { subtotal, total };
  },

  /**
   * Calcula el Saldo de un presupuesto específico (Total con IVA - Pagado).
   */
  async calcularSaldoPresupuesto(presupuestoId: string): Promise<number> {
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      include: { items: true, cobranzas: true },
    });

    if (!presupuesto) return 0;

    const { total } = this.calcularTotal(presupuesto.items, presupuesto.incluyeIva);
    const pagado = presupuesto.cobranzas.reduce((acc, cobro) => acc + cobro.importe, 0);
    return total - pagado;
  },

  /**
   * Crea un nuevo presupuesto.
   */
  async crearPresupuesto(data: any) {
    return await prisma.$transaction(async (tx: any) => {
      const presupuesto = await tx.presupuesto.create({
        data: {
          clienteId: data.clienteId,
          ordenId: data.ordenId || null,
          usuarioId: data.usuarioId,
          moneda: data.moneda || "ARS",
          formaPago: data.formaPago || "Contado",
          validezDias: data.validezDias || 7,
          incluyeIva: data.incluyeIva ?? false,
          observaciones: data.observaciones || null,
          estado: data.estado || "PRESUPUESTADO",
          estadoCobro: "APROBACION_PENDIENTE",
          items: {
            create: data.items.map((item: any) => ({
              cantidad: item.cantidad,
              descripcion: item.descripcion,
              precio: item.precio,
              total: item.cantidad * item.precio,
            })),
          },
        },
        include: { items: true },
      });

      // Si nace ya como APROBADO, impactar CC
      if (presupuesto.estado === "APROBADO") {
        const { total } = this.calcularTotal(presupuesto.items, presupuesto.incluyeIva);
        await cuentaCorrienteService.registrarMovimiento(tx, {
          clienteId: presupuesto.clienteId,
          tipo: "DEBE",
          origen: "PRESUPUESTO",
          monto: total,
          presupuestoId: presupuesto.id,
        });
      }

      return presupuesto;
    });
  },

  /**
   * Aprueba un presupuesto y registra el DEBE en Cuenta Corriente con el total correcto (con IVA si aplica).
   */
  async aprobarPresupuesto(presupuestoId: string) {
    return await prisma.$transaction(async (tx: any) => {
      const presupuesto = await tx.presupuesto.findUnique({
        where: { id: presupuestoId },
        include: { items: true },
      });

      if (!presupuesto || presupuesto.estado === "APROBADO") return null;

      const actualizado = await tx.presupuesto.update({
        where: { id: presupuestoId },
        data: { estado: "APROBADO", estadoCobro: "COBRO_PENDIENTE" },
      });

      // Usar total con IVA aplicado para el asiento contable
      const { total } = this.calcularTotal(presupuesto.items, presupuesto.incluyeIva);

      await cuentaCorrienteService.registrarMovimiento(tx, {
        clienteId: presupuesto.clienteId,
        tipo: "DEBE",
        origen: "PRESUPUESTO",
        monto: total,
        presupuestoId: presupuesto.id,
      });

      return actualizado;
    });
  },

  /**
   * Actualiza los ítems de un presupuesto y, si ya está APROBADO,
   * recalcula y actualiza el asiento DEBE en CuentaCorriente.
   */
  async actualizarItems(presupuestoId: string, items: { cantidad: number; descripcion: string; precio: number }[]) {
    return await prisma.$transaction(async (tx: any) => {
      const presupuesto = await tx.presupuesto.findUnique({
        where: { id: presupuestoId },
        select: { estado: true, clienteId: true, incluyeIva: true },
      });

      if (!presupuesto) throw new Error("Presupuesto no encontrado");

      // Reemplazar todos los items
      await tx.itemPresupuesto.deleteMany({ where: { presupuestoId } });
      await tx.presupuesto.update({
        where: { id: presupuestoId },
        data: {
          items: {
            create: items.map((item) => ({
              cantidad: item.cantidad,
              descripcion: item.descripcion,
              precio: item.precio,
              total: item.cantidad * item.precio,
            })),
          },
        },
      });

      // Si ya estaba aprobado, actualizar el asiento DEBE en CuentaCorriente
      if (presupuesto.estado === "APROBADO") {
        // Borrar asiento anterior de este presupuesto
        await tx.cuentaCorriente.deleteMany({
          where: { presupuestoId, tipo: "DEBE" },
        });

        // Recalcular con los nuevos items
        const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precio, 0);
        const total = presupuesto.incluyeIva ? subtotal * 1.21 : subtotal;

        await cuentaCorrienteService.registrarMovimiento(tx, {
          clienteId: presupuesto.clienteId,
          tipo: "DEBE",
          origen: "PRESUPUESTO",
          monto: total,
          presupuestoId,
        });
      }

      return { success: true };
    });
  },
};
