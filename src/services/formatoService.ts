export const formatoService = {
  /**
   * Pone la primera letra de una cadena en mayúscula, 
   * manteniendo el resto de la cadena tal cual o forzando a minúscula.
   */
  capitalizarPrimeraLetra(texto: string | null | undefined): string {
    if (!texto) return "";
    return texto.replace(/^(.)/, (m) => m.toUpperCase());
  },

  /**
   * Capitaliza la primera letra de cada palabra (Title Case).
   * Mantiene todos los espacios intactos.
   */
  capitalizarPalabras(texto: string | null | undefined): string {
    if (!texto) return "";
    return texto.replace(/\b(\w)/g, (m) => m.toUpperCase());
  }
};
