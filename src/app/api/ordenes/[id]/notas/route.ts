import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
