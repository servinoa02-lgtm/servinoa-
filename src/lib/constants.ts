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

// ─── IVA ────────────────────────────────────────────────────────────────────
export const IVA_RATE = 1.21;

export function calcularTotalConIVA(subtotal: number, incluyeIva: boolean): number {
  return incluyeIva ? subtotal * IVA_RATE : subtotal;
}
