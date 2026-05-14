import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const user = session.user as { id?: string };

  try {
    const { texto, esSeguimiento } = await req.json();

    const nota = await prisma.nota.create({
      data: {
        texto,
        esSeguimiento: !!esSeguimiento,
        ordenId: id,
        usuarioId: user.id!,
      }
    });

    return NextResponse.json(nota);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
