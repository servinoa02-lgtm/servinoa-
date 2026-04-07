import { prisma } from "@/lib/prisma";

export const notificacionService = {
  /**
   * Encola un mensaje para ser enviado luego. 
   * @param tipo "WHATSAPP" o "EMAIL"
   * @param destinatario N° de telefono o Email
   * @param payload Objeto libre que luego será parseado
   * @param horasDelay Demora en horas (0 = enviar lo antes posible)
   */
  async encolar(
    tipo: "WHATSAPP" | "EMAIL",
    destinatario: string,
    payload: any,
    horasDelay: number = 0
  ) {
    const procesarDespuesDe = new Date();
    procesarDespuesDe.setHours(procesarDespuesDe.getHours() + horasDelay);

    return await prisma.colaMensajes.create({
      data: {
        tipoNotificacion: tipo,
        destinatario,
        datos: JSON.stringify(payload),
        procesarDespuesDe,
      }
    });
  },

  /**
   * Método que debe ser llamado por un CRON Job (Ej: /api/cron) cada cierta cantidad de minutos.
   */
  async procesarCola() {
    const ahora = new Date();

    // 1. Buscar mensajes pendientes cuyo tiempo de espera ya venció
    const pendientes = await prisma.colaMensajes.findMany({
      where: {
        estado: "PENDIENTE",
        procesarDespuesDe: { lte: ahora }
      },
      take: 20 // Lote para no saturar
    });

    for (const msg of pendientes) {
      try {
        const datos = JSON.parse(msg.datos);

        if (msg.tipoNotificacion === "WHATSAPP") {
          // Acá iría la integración real (Baileys, Meta API, etc.)
          console.log(`[WA_SIMULATOR] Enviando WhatsApp a ${msg.destinatario}:`, datos);
        } else if (msg.tipoNotificacion === "EMAIL") {
          // Acá iría Resend or Nodemailer
          console.log(`[EMAIL_SIMULATOR] Enviando Email a ${msg.destinatario}:`, datos);
        }

        // Marcar como enviado
        await prisma.colaMensajes.update({
          where: { id: msg.id },
          data: { estado: "ENVIADO" }
        });

      } catch (error) {
        console.error(`Error procesando mensaje cola ID ${msg.id}:`, error);
        // Incrementar reintentos
        await prisma.colaMensajes.update({
          where: { id: msg.id },
          data: { 
            estado: msg.reintentos >= 3 ? "ERROR" : "PENDIENTE",
            reintentos: msg.reintentos + 1 
          }
        });
      }
    }

    return pendientes.length;
  }
};
