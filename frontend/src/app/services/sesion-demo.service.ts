
import { Injectable, signal } from '@angular/core';

export type RolDemo =
  | 'visitante'
  | 'cliente'
  | 'trabajador'
  | 'administrador';

@Injectable({
  providedIn: 'root'
})
export class SesionDemoService {

  private readonly _rolActual =
    signal<RolDemo>('visitante');

  readonly rolActual = this._rolActual.asReadonly();

  cambiarRol(rol: RolDemo): void {
    this._rolActual.set(rol);
  }
}
