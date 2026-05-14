import { prisma } from "./prisma";

/**
 * Calcula los saldos de todas las cajas registradas.
 * @param cutoffDate Opcional. Si se provee, calcula el saldo hasta esa fecha inclusive.
 */
export async function obtenerSaldosCajas(cutoffDate?: Date) {
  const [cajas, grouped] = await Promise.all([
    prisma.caja.findMany({ select: { id: true, nombre: true } }),
    prisma.movimientoCaja.groupBy({
      by: ["cajaId"],
      where: cutoffDate ? { fecha: { lte: cutoffDate } } : undefined,
      _sum: { ingreso: true, egreso: true },
    }),
  ]);

  return cajas.map((caja) => {
    const g = grouped.find((r) => r.cajaId === caja.id);
    const ingreso = Number(g?._sum.ingreso || 0);
    const egreso = Number(g?._sum.egreso || 0);
    return { id: caja.id, nombre: caja.nombre, saldo: ingreso - egreso };
  });
}

/**
 * Calcula el capital total en cajas (efectivo, bancos, cheques).
 * Excluye la caja "Retenciones" ya que no representa capital disponible.
 */
export async function calcularCapitalCajas() {
  const saldos = await obtenerSaldosCajas();
  return saldos
    .filter((c) => c.nombre.toUpperCase() !== "RETENCIONES")
    .reduce((acc, current) => acc + current.saldo, 0);
}

/**
 * Calcula el saldo total en calle (lo que deben los clientes)
 */
export async function calcularSaldoEnCalle() {
  const agg = await prisma.cuentaCorriente.groupBy({
    by: ["tipo"],
    _sum: {
      monto: true,
    },
  });

  const debe = Number(agg.find((g) => g.tipo === "DEBE")?._sum.monto || 0);
  const haber = Number(agg.find((g) => g.tipo === "HABER")?._sum.monto || 0);

  return debe - haber;
}

/**
 * Calcula el patrimonio total del sistema
 */
export async function calcularPatrimonioTotal() {
  const [capital, saldoCalle] = await Promise.all([
    calcularCapitalCajas(),
    calcularSaldoEnCalle(),
  ]);

  return capital + saldoCalle;
}
