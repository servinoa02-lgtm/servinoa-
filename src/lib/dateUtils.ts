const TZ = 'America/Argentina/Buenos_Aires';

export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-AR', { timeZone: TZ });
}

export function formatFechaHora(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleString('es-AR', { timeZone: TZ });
}

export function formatHora(
  date: Date | string | null | undefined,
  options?: Omit<Intl.DateTimeFormatOptions, 'timeZone'>
): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('es-AR', { timeZone: TZ, ...options });
}

// Retorna YYYY-MM-DD de hoy en zona AR (para valores por defecto en <input type="date">)
export function hoyISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function getARParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
  return { year: get('year'), month: get('month') - 1, day: get('day') };
}

// Inicio del mes actual en zona AR, retornado como UTC Date
export function inicioMesAR(): Date {
  const { year, month } = getARParts();
  // Argentina es UTC-3: medianoche AR = 03:00 UTC
  return new Date(Date.UTC(year, month, 1, 3, 0, 0));
}

// Fin del mes actual en zona AR, retornado como UTC Date
export function finMesAR(): Date {
  const { year, month } = getARParts();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // 23:59:59 AR = 26:59:59 UTC del mismo día (JS lo resuelve al día siguiente)
  return new Date(Date.UTC(year, month, lastDay, 26, 59, 59));
}

// Hace N días desde el inicio del día actual en zona AR, retornado como UTC Date
export function haceNDiasAR(n: number): Date {
  const { year, month, day } = getARParts();
  return new Date(Date.UTC(year, month, day - n, 3, 0, 0));
}

// Año actual en zona AR
export function anoActualAR(): number {
  return getARParts().year;
}

// Formatea un UTC Date como "DD/MM" usando zona AR (para labels de gráficos)
export function labelDiaMes(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('day')}/${get('month')}`;
}
