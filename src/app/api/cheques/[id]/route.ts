import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION", "CAJA"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const body = await req.json();
    
    const dataToUpdate: any = { ...body };
    if (body.fechaEmision) dataToUpdate.fechaEmision = new Date(body.fechaEmision);
    if (body.fechaCobro) dataToUpdate.fechaCobro = new Date(body.fechaCobro);
    if (body.importe) dataToUpdate.importe = parseFloat(body.importe);

    const cheque = await prisma.cheque.update({
      where: { id },
      data: dataToUpdate,
      include: {
        cliente: { include: { empresa: true } },
      },
    });

    return NextResponse.json(cheque);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar cheque" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["ADMIN", "JEFE", "ADMINISTRACION"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    const cobranza = await prisma.cobranza.findUnique({ where: { chequeId: id } });
    if (cobranza) {
       return NextResponse.json({ error: "Este cheque pertenece a una Cobranza. Debe eliminar la cobranza para deshacer el pago." }, { status: 400 });
    }

    await prisma.cheque.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar cheque" },
      { status: 500 }
    );
  }
}
