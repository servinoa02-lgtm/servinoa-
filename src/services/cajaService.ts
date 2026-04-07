import { prisma } from "@/lib/prisma";

export const cajaService = {
  /**
   * Obtiene todas las cajas con sus saldos actuales.
   * El saldo se calcula como SUM(ingresos) - SUM(egresos) en base a la fecha de filtro.
   */
  async getSaldosCajas(hastaFecha?: Date) {
    const cajas = await prisma.caja.findMany();
    
    const saldos = await Promise.all(cajas.map(async (caja) => {
      const movimientos = await prisma.movimientoCaja.aggregate({
        where: {
          cajaId: caja.id,
          ...(hastaFecha ? { fecha: { lte: hastaFecha } } : {})
        },
        _sum: {
          ingreso: true,
          egreso: true,
        }
      });

      const ingreso = movimientos._sum.ingreso || 0;
      const egreso = movimientos._sum.egreso || 0;

      return {
        ...caja,
        saldo: ingreso - egreso,
        ingresosTotales: ingreso,
        egresosTotales: egreso,
      };
    }));

    return saldos;
  },

  /**
   * Obtiene el historial de movimientos de una caja específica.
   */
  async getMovimientos(cajaId: string, limit: number = 50) {
    return await prisma.movimientoCaja.findMany({
      where: { cajaId },
      orderBy: { fecha: 'desc' },
      take: limit,
      include: {
        caja: true,
      }
    });
  },

  /**
   * Obtiene los cheques próximos a vencer o vencidos en la Caja de Cheques.
   * Supone que existe una consulta a la tabla Cheque y asocia a clientes.
   */
  async getChequesEstado() {
    const hoy = new Date();
    // Aproximadamente 7 días hacia adelante
    const proximaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

    const cheques = await prisma.cheque.findMany({
      where: {
        estado: 'EN_CARTERA', // Solo cheques que tenemos físicamente
      },
      include: { cliente: true },
      orderBy: { fechaCobro: 'asc' }
    });

    return cheques.map((cheque: any) => {
      if (!cheque.fechaCobro) return { ...cheque, status: 'UNKNOWN', diasDif: 0 };
      
      const dif = cheque.fechaCobro.getTime() - hoy.getTime();
      const diasDif = Math.ceil(dif / (1000 * 3600 * 24));
      
      let status = 'OK';
      if (diasDif < 0) status = 'VENCIDO';
      else if (diasDif <= 7) status = 'PROXIMO';

      return { ...cheque, status, diasDif };
    });
  }
};
