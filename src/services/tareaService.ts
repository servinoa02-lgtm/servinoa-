import { prisma } from "@/lib/prisma";
import { EstadoTarea, PrioridadTarea } from "@prisma/client";

export const tareaService = {
  /**
   * Crea una nueva Tarea asignada a un usuario.
   */
  async crearTarea(data: {
    descripcion: string;
    prioridad: PrioridadTarea;
    vencimiento?: Date;
    usuarioId: string;
    observaciones?: string;
  }) {
    return await prisma.tarea.create({
      data: {
        descripcion: data.descripcion,
        prioridad: data.prioridad,
        vencimiento: data.vencimiento,
        usuarioId: data.usuarioId,
        observaciones: data.observaciones,
      }
    });
  },

  /**
   * Obtiene todas las tareas del sistema, ideal para el ADMIN.
   */
  async getTodas(incluirCompletadas = false) {
    return await prisma.tarea.findMany({
      where: incluirCompletadas ? undefined : { estado: { not: "COMPLETADA" } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: [
        { vencimiento: 'asc' },
        { prioridad: 'desc' },
      ],
    });
  },

  /**
   * Obtiene tareas asignadas a un usuario en particular.
   */
  async getPorUsuario(usuarioId: string) {
    return await prisma.tarea.findMany({
      where: { usuarioId, estado: { not: "COMPLETADA" } },
      orderBy: [
        { vencimiento: 'asc' },
        { prioridad: 'desc' },
      ],
    });
  },

  /**
   * Cambia el estado de la tarea (Ej: de PENDIENTE a EN_PROGRESO o COMPLETADA)
   */
  async cambiarEstado(id: string, estado: EstadoTarea) {
    return await prisma.tarea.update({
      where: { id },
      data: { estado }
    });
  }
};
