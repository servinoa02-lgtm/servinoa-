"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectPath?: string;
}

/**
 * Componente cliente para proteger rutas en el frontend.
 * Si el usuario no tiene el rol necesario, redirige al dashboard o login.
 */
export function RoleGuard({ children, allowedRoles, redirectPath = "/dashboard" }: RoleGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.rol;
      if (!allowedRoles.includes(userRole)) {
        router.push(redirectPath);
      }
    }
  }, [status, session, allowedRoles, router, redirectPath]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-40 min-h-screen bg-gray-50">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse uppercase tracking-widest">Verificando Credenciales...</div>
      </div>
    );
  }

  // Si no está cargando y tiene el rol, mostrar el contenido
  const userRole = (session?.user as any)?.rol;
  if (status === "authenticated" && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return null;
}
