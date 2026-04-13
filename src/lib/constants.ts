/**
 * Constantes centralizadas del sistema ServiNOA.
 * Usadas en APIs, services y componentes frontend.
 */

// ─── Formas de pago (unificadas) ────────────────────────────────────────────
export const FORMAS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Cheque",
  "Tarjeta",
  "Mercado Pago",
  "Otro",
] as const;

export type FormaPago = (typeof FORMAS_PAGO)[number];

// ─── Cajas por defecto ──────────────────────────────────────────────────────
export const CAJAS_DEFAULT = [
  "Pablo",
  "Julio",
  "Nico",
  "Servinoa",
  "Cheques",
  "Retenciones",
  "Macro",
  "Mercado Pago",
] as const;

// ─── Formato de número de presupuesto ──────────────────────────────────────
export function formatNumeroPresupuesto(numero: number, fecha: string): string {
  const year = new Date(fecha).getFullYear();
  return `${year}-${numero.toString().padStart(5, "0")}`;
}

// ─── Formato de moneda ─────────────────────────────────────────────────────
export function formatMoney(amount: number, decimals: number = 2): string {
  const abs = Math.abs(amount);
  return abs.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formatea con signo y $ para display: -$1.234,56 o $1.234,56 */
export function formatMoneyDisplay(amount: number, decimals: number = 0): string {
  const formatted = formatMoney(amount, decimals);
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

// ─── IVA ────────────────────────────────────────────────────────────────────
export const IVA_RATE = 1.21;

export function calcularTotalConIVA(subtotal: number, incluyeIva: boolean): number {
  return incluyeIva ? subtotal * IVA_RATE : subtotal;
}
