import { prisma } from "@/lib/prisma";
import { cuentaCorrienteService } from "./cuentaCorrienteService";

export const clienteService = {
  /**
   * Obtiene todos los clientes ordenados por fecha de creación (los más recientes primero).
   */
  async getClientes() {
    return await prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        empresa: true,
      },
    });
  },

  /**
   * Obtiene un cliente por su ID, con sus principales relaciones.
   */
  async getClienteById(id: string) {
    return await prisma.cliente.findUnique({
      where: { id },
      include: {
        empresa: true,
      },
    });
  },

  /**
   * Obtiene el saldo del cliente delegando al servicio especializado.
   */
  async getSaldo(clienteId: string) {
    return await cuentaCorrienteService.getSaldoCliente(clienteId);
  },

  /**
   * Obtiene presupuestos pendientes de un cliente.
   * Se define "pendiente" como aquellos estados donde aún no está rechazado ni cobrado al 100%.
   */
  async getPresupuestosPendientes(clienteId: string) {
    return await prisma.presupuesto.findMany({
      where: {
        clienteId,
        estado: {
          notIn: ["RECHAZADO"],
        },
        estadoCobro: {
          notIn: ["COBRADO"], // PENDIENTE, APROBACION_PENDIENTE, COBRO_PENDIENTE, PARCIAL
        },
      },
      include: {
        items: true,
      },
      orderBy: { fecha: "desc" },
    });
  },

  /**
   * Busca clientes que coincidan con la búsqueda (nombre, email, dni)
   */
  async buscarClientes(query: string) {
    return await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { dni: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }
};
