import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

/**
 * Helper para validar sesión y permisos en API Routes.
 * Retorna la sesión si es válida, o un NextResponse con error.
 *
 * Uso:
 *   const sesion = await requireAuth();
 *   if (sesion instanceof NextResponse) return sesion;
 *   // sesion.user.id, sesion.user.role, etc.
 */
export async function requireAuth(requiredRole?: string | string[]) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "No autorizado. Inicie sesión." },
      { status: 401 }
    );
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = (session.user as { rol?: string }).rol;
    if (!userRole || !roles.includes(userRole)) {
      return NextResponse.json(
        { error: "Sin permisos para esta acción" },
        { status: 403 }
      );
    }
  }

  return session;
}
