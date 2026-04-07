export const formatoService = {
  /**
   * Pone la primera letra de una cadena en mayúscula, 
   * manteniendo el resto de la cadena tal cual o forzando a minúscula.
   */
  capitalizarPrimeraLetra(texto: string | null | undefined): string {
    if (!texto) return "";
    
    const trimText = texto.trim();
    if (trimText.length === 0) return "";

    return trimText.charAt(0).toUpperCase() + trimText.slice(1);
  },

  /**
   * Capitaliza la primera letra de cada palabra (Title Case).
   * Ideal para Nombres de Clientes o Marcas.
   */
  capitalizarPalabras(texto: string | null | undefined): string {
    if (!texto) return "";
    
    return texto
      .trim()
      .split(/\s+/)
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(" ");
  }
};
