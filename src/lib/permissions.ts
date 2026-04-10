/**
 * Roles disponibles en el sistema según schema.prisma (limitados a uso actual):
 * ADMIN, JEFE, ADMINISTRACION, TECNICO
 */

export const ROLES = {
  ADMIN: "ADMIN",
  JEFE: "JEFE",
  ADMINISTRACION: "ADMINISTRACION",
  TECNICO: "TECNICO",
} as const;

type Role = keyof typeof ROLES;

export const permissions = {
  /**
   * ADMIN y JEFE tienen control total del sistema.
   * Solo ADMIN puede borrar usuarios o entrar a Configuración Crítica.
   */
  isAdmin(role?: string | null): boolean {
    return role === ROLES.ADMIN;
  },

  isJefeOrAdmin(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.JEFE;
  },

  /**
   * Para cobrar, ver finanzas, Cajas y Clientes, se requiere ADMIN, JEFE o ADMINISTRACION.
   */
  canManageFinances(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.JEFE || role === ROLES.ADMINISTRACION;
  },

  /**
   * Acceso a la lista de clientes.
   */
  canViewClients(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.JEFE || role === ROLES.ADMINISTRACION;
  },

  /**
   * Todos los roles pueden ver y operar OTs de forma básica,
   * pero aquí se valida el permiso extendido de edición (presupuestar, estados, etc).
   */
  canEditOT(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.JEFE || role === ROLES.ADMINISTRACION || role === ROLES.TECNICO;
  },

  /**
   * Borrar registros (Hard Delete) solo permitido a ADMIN y JEFE.
   */
  canDelete(role?: string | null): boolean {
    return role === ROLES.ADMIN || role === ROLES.JEFE;
  }
};
