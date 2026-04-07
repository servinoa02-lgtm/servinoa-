import { prisma } from "@/lib/prisma";
import { TipoMovimientoCuenta, OrigenMovimientoCuenta, Prisma, CuentaCorriente } from "@prisma/client";

export interface RegistrarMovimientoData {
  clienteId: string;
  tipo: TipoMovimientoCuenta;
  origen: OrigenMovimientoCuenta;
  monto: number;
  presupuestoId?: string;
  cobranzaId?: string;
}

export const cuentaCorrienteService = {
  /**
   * Registra un movimiento en la cuenta corriente del cliente.
   * Se puede pasar un cliente de transacción de Prisma (tx) opcionalmente.
   */
  async registrarMovimiento(
    tx: Prisma.TransactionClient | null,
    data: RegistrarMovimientoData
  ): Promise<CuentaCorriente> {
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
