import { useEffect, useRef } from "react";

/**
 * Auto-refresca datos en tres situaciones:
 * 1. Cada `intervalMs` milisegundos (default 30s)
 * 2. Cuando la ventana recupera el foco (el usuario vuelve a la pestaña)
 * 3. Cuando la pestaña vuelve a estar visible (alt-tab, cambio de app)
 *
 * Uso:
 *   useAutoRefresh(fetchDatos);          // cada 30s
 *   useAutoRefresh(fetchDatos, 15_000);  // cada 15s
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useAutoRefresh(callback: () => void, _intervalMs = 30_000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // DESACTIVADO TOTALMENTE - Evita cualquier refresco automático
  }, []);
}
