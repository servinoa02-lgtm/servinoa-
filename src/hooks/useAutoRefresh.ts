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
export function useAutoRefresh(callback: () => void, intervalMs = 30_000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // DESACTIVADO POR EL MOMENTO - Evita problemas al actualizar OTs
    /*
    const refresh = () => callbackRef.current();

    // Refresco periódico
    const timer = setInterval(refresh, intervalMs);

    // Refresco al volver al foco de ventana
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    // Refresco al volver a la pestaña (visibilitychange)
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
    */
  }, [intervalMs]);
}
