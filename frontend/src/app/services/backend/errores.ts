import { HttpErrorResponse } from '@angular/common/http';

/**
 * Convierte un error de HTTP en un texto para mostrar al usuario.
 * El backend manda un mensaje claro en español en error.error.message (a veces es una lista).
 */
export function mensajeDeError(error: unknown, porDefecto = 'No se pudo completar la operación. Inténtalo de nuevo.'): string {
  if (!(error instanceof HttpErrorResponse)) return porDefecto;
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Comprueba que el backend esté encendido.';
  }
  const m = (error.error as { message?: string | string[] } | null)?.message;
  if (m) return Array.isArray(m) ? m.join(' ') : m;
  return porDefecto;
}
