import { prisma } from "@/lib/prisma";
import { TipoMovimientoCuenta, OrigenMovimientoCuenta } from "@prisma/client";

export const cuentaCorrienteService = {
  /**
   * Registra un movimiento en la cuenta corriente del cliente.
   * Internamente no hace commit/rollback porque Prisma no tiene un Unit of Work nativo
   * en llamadas separadas a menos que se use \$transaction().
   * Se recomienda llamar a este método dentro de una transacción cuando sea posible.
   */
  async registrarMovimiento(
    tx: any, // Prisma Transaction Client
    data: {
      clienteId: string;
      tipo: TipoMovimientoCuenta;
      origen: OrigenMovimientoCuenta;
      monto: number;
      presupuestoId?: string;
      cobranzaId?: string;
    }
  ) {
    const db = tx || prisma;
    
    return await db.cuentaCorriente.create({
      data: {
        clienteId: data.clienteId,
        tipo: data.tipo,
        origen: data.origen,
        monto: data.monto,
        presupuestoId: data.presupuestoId,
        cobranzaId: data.cobranzaId,
      },
    });
  },

  /**
   * Consulta el saldo actual de un cliente específico,
   * calculando: SUM(DEBE) - SUM(HABER)
   */
  async getSaldoCliente(clienteId: string): Promise<number> {
    const agrupado = await prisma.cuentaCorriente.groupBy({
      by: ["tipo"],
      where: { clienteId },
      _sum: { monto: true },
    });

    let totalDebe = 0;
    let totalHaber = 0;

    for (const mov of agrupado) {
      if (mov.tipo === "DEBE") totalDebe += mov._sum.monto || 0;
      if (mov.tipo === "HABER") totalHaber += mov._sum.monto || 0;
    }

    return totalDebe - totalHaber;
  },

  /**
   * Obtiene todos los movimientos de cuenta de un cliente, ordenados por fecha descendente.
   */
  async getHistorialMovimientos(clienteId: string) {
    return await prisma.cuentaCorriente.findMany({
      where: { clienteId },
      orderBy: { fecha: "desc" },
      include: {
        presupuesto: { select: { numero: true, items: true } },
        cobranza: { select: { descripcion: true, importe: true } },
      },
    });
  },
};
