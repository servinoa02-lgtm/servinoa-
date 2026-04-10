import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ROLES_VALIDOS = ["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO", "CAJA", "VENTAS"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { nombre, email, rol, activo, password } = body;

    // Verificar email único si se cambia
    if (email) {
      const existe = await prisma.usuario.findFirst({
        where: { email, NOT: { id } },
      });
      if (existe) {
        return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (email !== undefined) data.email = email;
    if (rol !== undefined && ROLES_VALIDOS.includes(rol)) data.rol = rol;
    if (activo !== undefined) data.activo = activo;
    if (password) data.password = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // No borrar físicamente, solo desactivar para preservar histórico
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: { id: true, nombre: true, activo: true },
    });
    return NextResponse.json(usuario);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al desactivar usuario" }, { status: 500 });
  }
}
