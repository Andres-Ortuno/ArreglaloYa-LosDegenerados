import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService, type Rol } from '../../services/auth.service';

/** Encabezado de todas las páginas. Usa la sesión real (AuthService). */
@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-encabezado',
  styleUrl: './encabezado.css',
  templateUrl: './encabezado.html',
})
export class Encabezado {
  protected readonly auth = inject(AuthService);

  protected readonly etiquetaRol: Record<Rol, string> = {
    visitante: 'Visitante',
    cliente: 'Cliente',
    trabajador: 'Trabajador',
    administrador: 'Administrador',
  };

  protected cambiarRol(rol: Rol): void {
    this.auth.cambiarRol(rol);
  }

  protected salir(): void {
    this.auth.salir();
  }
}
