import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { EstadoOT } from "@prisma/client";

const MAX_FIRMA_BYTES = 500 * 1024; // 500 KB
const ESTADOS_CIERRE: EstadoOT[] = [
  EstadoOT.ENTREGADO_REALIZADO,
  EstadoOT.ENTREGADO_SIN_REALIZAR,
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await requireAuth(["ADMIN", "TECNICO", "VENTAS"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await params;

  try {
    const body = await req.json();
    const nombre: string = (body.nombre || "").toString().trim();
    const dni: string = (body.dni || "").toString().trim();
    const firma: string = (body.firma || "").toString();
    const tipoEntrega: string = (body.tipoEntrega || "").toString();

    // Validaciones
    if (nombre.length < 3) {
      return NextResponse.json(
        { error: "Nombre y apellido obligatorio (mín. 3 caracteres)." },
        { status: 400 }
      );
    }
    if (!/^[0-9]{7,9}$/.test(dni)) {
      return NextResponse.json(
        { error: "DNI inválido. Debe tener entre 7 y 9 dígitos." },
        { status: 400 }
      );
    }
    if (!firma.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { error: "Firma inválida o ausente." },
        { status: 400 }
      );
    }
    const base64 = firma.split(",")[1] ?? "";
    const sizeBytes = Math.floor((base64.length * 3) / 4);
    if (sizeBytes > MAX_FIRMA_BYTES) {
      return NextResponse.json(
        { error: "La firma supera los 500 KB permitidos." },
        { status: 400 }
      );
    }
    if (!ESTADOS_CIERRE.includes(tipoEntrega as EstadoOT)) {
      return NextResponse.json(
        { error: "Tipo de entrega inválido." },
        { status: 400 }
      );
    }

    const ordenExistente = await prisma.ordenTrabajo.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!ordenExistente) {
      return NextResponse.json({ error: "OT no encontrada." }, { status: 404 });
    }

    const nuevoEstado = tipoEntrega as EstadoOT;
    const etiqueta =
      nuevoEstado === EstadoOT.ENTREGADO_REALIZADO
        ? "ENTREGADO REALIZADO"
        : "ENTREGADO SIN REALIZAR";

    const orden = await prisma.$transaction(async (tx) => {
      await tx.retiro.create({
        data: {
          ordenId: id,
          nombre,
          dni,
          firma,
          realizada: true,
        },
      });

      await tx.historialOT.create({
        data: {
          ordenId: id,
          estadoAnterior: ordenExistente.estado,
          estadoNuevo: nuevoEstado,
          comentario: `[${etiqueta}] Entregado a ${nombre} (DNI ${dni})`,
        },
      });

      return tx.ordenTrabajo.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          fechaEntrega: new Date(),
        },
        include: {
          cliente: { include: { empresa: true } },
          tecnico: true,
          creador: true,
          maquina: true,
          marca: true,
          modelo: true,
          presupuestos: { include: { items: true }, orderBy: { createdAt: "desc" } },
          notas: { include: { usuario: true }, orderBy: { fecha: "desc" } },
          fotos: true,
          retiros: { orderBy: { fecha: "desc" } },
          historial: { orderBy: { fecha: "asc" } },
        },
      });
    });

    return NextResponse.json(orden);
  } catch (error) {
    console.error("[POST /api/ordenes/[id]/retiros]", error);
    return NextResponse.json(
      { error: "Error al registrar el retiro." },
      { status: 500 }
    );
  }
}
