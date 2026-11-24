import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';

/**
 * Agrega «Authorization: Bearer <token>» a cada petición a la API y,
 * si el backend responde 401 (token vencido), cierra la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith(API_BASE_URL)) return siguiente(peticion);

  const auth = inject(AuthService);
  const token = auth.token();
  const conToken = token ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : peticion;

  return siguiente(conToken).pipe(
    catchError((error: unknown) => {
      // Un 401 en /auth/login significa «contraseña incorrecta», no sesión vencida.
      const esLogin = peticion.url.includes('/auth/login');
      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin) {
        auth.sesionVencida();
      }
      return throwError(() => error);
    }),
  );
};
