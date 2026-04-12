import { useState, useEffect } from "react";

/**
 * Hook para debouncing de valores (ej: búsquedas)
 * El patrón esperado es: const [debouncedValue] = useDebounce(value, delay)
 */
export function useDebounce<T>(value: T, delay: number = 500): [T] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue];
}
