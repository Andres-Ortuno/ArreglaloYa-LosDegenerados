
import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';

import {
  Observable,
  catchError,
  defer,
  finalize,
  tap,
  throwError
} from 'rxjs';

export class EstadoHttp {

  // Número de peticiones en curso
  private readonly _peticionesActivas = signal(0);

  // Mensajes privados
  private readonly _error = signal<string | null>(null);
  private readonly _exito = signal<string | null>(null);

  // Estados disponibles para las páginas
  readonly cargando = computed(
    () => this._peticionesActivas() > 0
  );

  readonly error = this._error.asReadonly();
  readonly exito = this._exito.asReadonly();

  // EJECUTAR UNA PETICIÓN HTTP
  ejecutar<T>(
    peticion: () => Observable<T>,
    mensajeExito: string
  ): Observable<T> {

    return defer(() => {

      // Comienza la petición
      this._peticionesActivas.update(n => n + 1);

      // Limpiar mensajes anteriores
      this._error.set(null);
      this._exito.set(null);

      return peticion().pipe(

        // RESPUESTA CORRECTA
        tap(() => {
          this._exito.set(mensajeExito);
        }),

        // RESPUESTA CON ERROR
        catchError((error: unknown) => {

          this._error.set(
            this.obtenerMensajeError(error)
          );

          return throwError(() => error);
        }),

        // FINALIZAR LA PETICIÓN
        finalize(() => {

          this._peticionesActivas.update(
            n => Math.max(0, n - 1)
          );

        })
      );
    });
  }

  // TRANSFORMAR ERRORES TÉCNICOS EN MENSAJES CLAROS
  private obtenerMensajeError(error: unknown): string {

    if (!(error instanceof HttpErrorResponse)) {
      return 'Ocurrió un error inesperado.';
    }

    // El backend responde con un mensaje claro en español (error.error.message).
    // Si existe, se muestra ese; en los errores de validación puede ser una lista.
    const mensajeBackend = (error.error as { message?: string | string[] } | null)?.message;
    if (error.status !== 0 && mensajeBackend) {
      return Array.isArray(mensajeBackend) ? mensajeBackend.join(' ') : mensajeBackend;
    }

    switch (error.status) {

      case 0:
        return 'No se pudo conectar con el servidor. ' +
          'Comprueba la API, la conexión y su configuración.';

      case 400:
        return 'La solicitud contiene datos incorrectos.';

      case 401:
        return 'Debes iniciar sesión para continuar.';

      case 403:
        return 'No tienes permiso para realizar esta acción.';

      case 404:
        return 'No se encontró el recurso solicitado.';

      case 409:
        return 'La operación entra en conflicto con los datos existentes.';

      case 422:
        return 'El servidor no pudo validar los datos enviados.';

      case 500:
        return 'El servidor presentó un problema interno.';

      default:
        return 'No se pudo completar la operación. ' +
          'Código HTTP: ' + error.status;
    }
  }
}
