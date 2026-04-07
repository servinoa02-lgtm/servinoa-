/**
 * Roles disponibles en el sistema según schema.prisma:
 * ADMIN, TECNICO, CAJA, VENTAS
 */

export const ROLES = {
  ADMIN: "ADMIN",
  TECNICO: "TECNICO",
  CAJA: "CAJA",
  VENTAS: "VENTAS",
} as const;

type Role = keyof typeof ROLES;

export const permissions = {
  /**
   * Solo el ADMIN tiene control total.
   */
  isAdmin(role?: string | null): boolean {
    return role === ROLES.ADMIN;
  },

  /**
   * Para cobrar o ver finanzas fuertes, se requiere ADMIN o CAJA.
   */
  canManageFinances(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.CAJA;
  },

  /**
   * Técnicos pueden editar OTs y sus estados de diagnóstico.
   * Admin y Ventas también. Caja generalmente no edita reparaciones.
   */
  canEditOT(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.TECNICO || role === ROLES.VENTAS;
  },

  /**
   * Borrar registros (Hard Delete) solo permitido a ADMIN.
   */
  canDelete(role?: string | null): boolean {
    return role === ROLES.ADMIN;
  }
};
