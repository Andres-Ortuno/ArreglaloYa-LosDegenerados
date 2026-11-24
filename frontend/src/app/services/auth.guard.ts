import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService, type Rol } from './auth.service';

/**
 * Protege rutas que requieren sesión. Opcional: data: { roles: ['trabajador'] } para exigir un rol.
 * En el servidor (renderizado previo) siempre deja pasar; la comprobación real ocurre en el navegador.
 */
export const authGuard: CanActivateFn = (ruta) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.hayToken()) return router.createUrlTree(['/ingresar']);

  const exigidos = ruta.data['roles'] as Rol[] | undefined;

  // Al recargar la página la cuenta aún no se cargó: se espera antes de decidir.
  return auth.asegurarCuenta().pipe(
    map(() => {
      if (exigidos && !exigidos.some((r) => auth.rolesDisponibles().includes(r))) {
        return router.createUrlTree(['/']);
      }
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/ingresar']))),
  );
};
