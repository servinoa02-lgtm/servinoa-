// Ajusta una fecha según el ciclo comercial de ServiNOA (Cierre 25 Dic - 4 Ene)
export function adjustDateForBusinessCycle(date: Date): Date {
  const m = date.getMonth();
  const d = date.getDate();
  const y = date.getFullYear();

  // 25 Dic - 31 Dic -> Mover al 24 Dic
  if (m === 11 && d >= 25) {
    return new Date(Date.UTC(y, 11, 24, 3, 0, 0));
  }
  // 1 Ene - 4 Ene -> Mover al 5 Ene
  if (m === 0 && d <= 4) {
    return new Date(Date.UTC(y, 0, 5, 3, 0, 0));
  }
  return date;
}
