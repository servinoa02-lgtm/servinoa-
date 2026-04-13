import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { whatsappService } from "@/lib/whatsapp";

export async function POST(req: Request) {
  const session = await requireAuth(["ADMIN", "JEFE"]);
  if (session instanceof NextResponse) return session;

  try {
    const { nota } = await req.json();

    const config = await prisma.configuracion.upsert({
      where: { clave: "NOTA_GLOBAL" },
      update: { valor: nota },
      create: { clave: "NOTA_GLOBAL", valor: nota },
    });

    // Notificar a todos los usuarios activos con teléfono registrado
    if (nota?.trim()) {
      const usuarios = await prisma.usuario.findMany({
        where: { activo: true, telefono: { not: null } },
        select: { telefono: true },
      });

      const telefonos = usuarios
        .map((u) => u.telefono!)
        .filter(Boolean);

      if (telefonos.length > 0) {
        const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const mensaje =
          `📢 *ServiNOA* — Aviso del equipo\n\n` +
          `${nota}\n\n` +
          `Ver panel: ${appUrl}/dashboard`;

        whatsappService.enviarATodos(telefonos, mensaje).catch(() => {});
      }
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error al guardar la nota global:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
