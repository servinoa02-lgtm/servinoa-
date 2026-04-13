/**
 * WhatsApp via Meta Cloud API — compatible con Vercel (serverless).
 *
 * Variables de entorno necesarias:
 *   WHATSAPP_TOKEN     → Token de acceso permanente de la app Meta
 *   WHATSAPP_PHONE_ID  → ID del número de teléfono en Meta (no el número en sí)
 */

const META_API_URL = "https://graph.facebook.com/v19.0";

// Argentina: 10 dígitos locales → formato internacional sin "+"
// Ej: 3872239277 → 543872239277 (Meta resuelve el 9 internamente)
function formatearNumero(telefono: string): string {
  const limpio = telefono.replace(/\D/g, "");
  return `54${limpio}`;
}

async function enviar(telefono: string, mensaje: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.warn("[WhatsApp] WHATSAPP_TOKEN o WHATSAPP_PHONE_ID no configurados.");
    return false;
  }

  const numero = formatearNumero(telefono);

  try {
    const res = await fetch(`${META_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: mensaje },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[WhatsApp] Error de API:", JSON.stringify(err));
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[WhatsApp] Error enviando a ${telefono}:`, error);
    return false;
  }
}

export const whatsappService = {
  // Métodos heredados del servicio anterior — la firma es idéntica
  async enviarMensaje(telefono: string, mensaje: string): Promise<boolean> {
    return enviar(telefono, mensaje);
  },

  async enviarATodos(telefonos: string[], mensaje: string): Promise<void> {
    await Promise.all(telefonos.map((tel) => enviar(tel, mensaje)));
  },

  // Para la página de configuración
  estaConfigurado(): boolean {
    return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  },
};
