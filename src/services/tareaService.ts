import { prisma } from "@/lib/prisma";
import { EstadoTarea, PrioridadTarea } from "@prisma/client";
import { whatsappService } from "@/lib/whatsapp";

const PRIORIDAD_EMOJI: Record<PrioridadTarea, string> = {
  ALTA: "🔴",
  URGENTE: "🚨",
  MEDIA: "🟡",
  BAJA: "🟢",
};

export const tareaService = {
  /**
   * Crea una nueva Tarea asignada a un usuario y notifica por WhatsApp.
   */
  async crearTarea(data: {
    descripcion: string;
    prioridad: PrioridadTarea;
    vencimiento?: Date;
    usuarioId: string;
    observaciones?: string;
  }) {
    const tarea = await prisma.tarea.create({
      data: {
        descripcion: data.descripcion,
        prioridad: data.prioridad,
        vencimiento: data.vencimiento,
        usuarioId: data.usuarioId,
        observaciones: data.observaciones,
      },
      include: {
        usuario: { select: { nombre: true, telefono: true } },
      },
    });

    // Notificación WA (no bloquea la respuesta)
    if (tarea.usuario.telefono) {
      const emoji = PRIORIDAD_EMOJI[data.prioridad] ?? "📋";
      const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const vencStr = data.vencimiento
        ? `\n📅 Vence: ${data.vencimiento.toLocaleDateString("es-AR")}`
        : "";

      const mensaje =
        `🔔 *ServiNOA* — Nueva tarea asignada\n\n` +
        `${emoji} ${data.descripcion}${vencStr}\n\n` +
        `Ver sistema: ${appUrl}/tareas`;

      whatsappService.enviarMensaje(tarea.usuario.telefono, mensaje).catch(() => {});
    }

    return tarea;
  },

  /**
   * Obtiene todas las tareas del sistema, ideal para el ADMIN.
   */
  async getTodas(incluirCompletadas = false) {
    return await prisma.tarea.findMany({
      where: incluirCompletadas ? undefined : { estado: { not: "COMPLETADA" } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: [
        { vencimiento: "asc" },
        { prioridad: "desc" },
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
        { vencimiento: "asc" },
        { prioridad: "desc" },
      ],
    });
  },

  /**
   * Cambia el estado de la tarea (Ej: de PENDIENTE a EN_PROGRESO o COMPLETADA)
   */
  async cambiarEstado(id: string, estado: EstadoTarea) {
    return await prisma.tarea.update({
      where: { id },
      data: { estado },
    });
  },
};
