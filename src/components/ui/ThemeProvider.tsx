"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  
  // Registrar Service Worker para la PWA
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado exitosamente con el scope: ', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Fallo al registrar el Service Worker:', error);
        });
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
