import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { whatsappService } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAuth(["ADMIN", "JEFE"]);
  if (session instanceof NextResponse) return session;

  const { telefono } = await req.json();
  if (!telefono || typeof telefono !== "string" || !telefono.trim()) {
    return NextResponse.json({ error: "Se requiere el campo telefono" }, { status: 400 });
  }

  if (!whatsappService.estaConfigurado()) {
    return NextResponse.json({ ok: false, error: "WhatsApp no está configurado (faltan variables de entorno)" }, { status: 503 });
  }

  const ok = await whatsappService.enviarMensaje(
    telefono.trim(),
    "🔔 *ServiNOA* — Test de configuración exitoso."
  );

  return NextResponse.json({ ok });
}
