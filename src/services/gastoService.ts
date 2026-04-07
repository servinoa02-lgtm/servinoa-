import { prisma } from "@/lib/prisma";

export const gastoService = {
  /**
   * Registra un nuevo gasto, asegurando que se descuente de la caja seleccionada.
   */
  async registrarGasto(data: any) {
    if (!data.cajaId) {
      throw new Error("La caja es obligatoria para registrar un gasto.");
    }

    return await prisma.$transaction(async (tx: any) => {
      // 1. Crear el Gasto
      const gasto = await tx.gasto.create({
        data: {
          tipo: data.tipo || 'GASTO_VARIOS',
          descripcion: data.descripcion,
          importe: data.importe,
          formaPago: data.formaPago || 'Efectivo',
          comprobante: data.comprobante,
          cajaId: data.cajaId,
          proveedorId: data.proveedorId,
          usuarioId: data.usuarioId,
        }
      });

      // 2. Descontar de la caja
      await tx.movimientoCaja.create({
        data: {
          fecha: new Date(),
          descripcion: `Gasto #${gasto.id.slice(-5)} - ${data.descripcion}`,
          ingreso: 0,
          egreso: data.importe,
          formaPago: data.formaPago,
          cajaId: data.cajaId,
          gastoId: gasto.id,
        }
      });

      return gasto;
    });
  }
};
