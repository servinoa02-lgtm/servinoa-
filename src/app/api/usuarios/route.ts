import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ROLES_VALIDOS = ["ADMIN", "JEFE", "ADMINISTRACION", "TECNICO", "CAJA", "VENTAS"];

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al cargar usuarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, email, password, rol } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
    }

    // Verificar email único
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }

    const rolFinal = rol && ROLES_VALIDOS.includes(rol) ? rol : "TECNICO";

    const hash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hash,
        rol: rolFinal,
        activo: true,
      },
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
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
