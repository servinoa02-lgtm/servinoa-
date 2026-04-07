import { prisma } from "@/lib/prisma";
import { cuentaCorrienteService } from "./cuentaCorrienteService";
import { presupuestoService } from "./presupuestoService";

export const cobranzaService = {
  /**
   * Registra una nueva cobranza y afecta la Caja y la Cuenta Corriente simultáneamente.
   * Valida saldos para no cobrar de más si está vinculado a un Presupuesto.
   */
  async registrarCobranza(data: any) {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Validar que no se cobre más que el saldo si es un cobro a Presupuesto
      if (data.presupuestoId) {
        const saldoPendiente = await presupuestoService.calcularSaldoPresupuesto(data.presupuestoId);
        if (data.importe > saldoPendiente) {
          throw new Error(`El importe (${data.importe}) supera el saldo pendiente del presupuesto (${saldoPendiente})`);
        }
      }

      // 2. Crear cobranza
      const cobranza = await tx.cobranza.create({
        data: {
          tipo: data.tipo || 'PRESUPUESTO',
          importe: data.importe,
          formaPago: data.formaPago || 'Efectivo',
          descripcion: data.descripcion,
          clienteId: data.clienteId,
          presupuestoId: data.presupuestoId,
          cajaId: data.cajaId,
          usuarioId: data.usuarioId,
          chequeId: data.chequeId,
        },
      });

      // 3. Impactar Cuenta Corriente del Cliente (Como HABER, resta deuda)
      if (data.clienteId) {
        await cuentaCorrienteService.registrarMovimiento(tx, {
          clienteId: data.clienteId,
          tipo: 'HABER',
          origen: 'COBRANZA',
          monto: data.importe,
          cobranzaId: cobranza.id,
        });
      }

      // 4. Impactar Caja General (Ingreso)
      await tx.movimientoCaja.create({
        data: {
          fecha: new Date(),
          descripcion: `Cobranza #${cobranza.id.slice(-5)} - ${data.descripcion || ''}`,
          ingreso: data.importe,
          egreso: 0,
          formaPago: data.formaPago,
          cajaId: data.cajaId,
          cobranzaId: cobranza.id,
        }
      });

      // 5. Actualizar estado de cobro en el Presupuesto, si aplica
      if (data.presupuestoId) {
        const saldoPendiente = await presupuestoService.calcularSaldoPresupuesto(data.presupuestoId);
        // Descontamos este importe manualmente porque calcularSaldoPresupuesto usa la DB sin la tx en curso
        const nuevoSaldo = saldoPendiente - data.importe; 
        
        let nuevoEstadoCobro = "PARCIAL";
        if (nuevoSaldo <= 0) {
          nuevoEstadoCobro = "COBRADO";
        }

        await tx.presupuesto.update({
          where: { id: data.presupuestoId },
          data: { estadoCobro: nuevoEstadoCobro as any }
        });
      }

      return cobranza;
    });
  }
};
